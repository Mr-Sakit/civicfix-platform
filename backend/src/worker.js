import { config } from "./config.js";
import { query } from "./db.js";
import { analyzeIssueImage } from "./aiAnalyzer.js";
import { createServer } from "node:http";
import { aiJobDuration, aiJobsTotal, registry } from "./metrics.js";
import { ensureQueueReady, receiveImageAnalysisJob } from "./queue.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const updateIssueAsFailed = async (issueId, error) => {
  await query(
    `
      UPDATE civic_issues
      SET ai_status = 'failed',
          ai_summary = $1,
          ai_processed_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
    `,
    [`AI worker failed: ${error.message}`, issueId]
  );
};

const processJob = async (job) => {
  const end = aiJobDuration.startTimer({ provider: config.queue.provider });
  const { issueId, imageUrl, imageName } = job.payload;

  try {
    if (!Number.isInteger(Number(issueId))) {
      throw new Error("Queue message is missing a valid issueId");
    }

    await query(
      `
        UPDATE civic_issues
        SET ai_status = 'processing',
            updated_at = NOW()
        WHERE id = $1
      `,
      [issueId]
    );

    const issue = await query(
      `
        SELECT title, description
        FROM civic_issues
        WHERE id = $1
      `,
      [issueId]
    );

    if (issue.rowCount === 0) {
      throw new Error(`Issue ${issueId} no longer exists`);
    }

    const analysis = await analyzeIssueImage({
      title: issue.rows[0].title,
      description: issue.rows[0].description,
      imageName,
      imageUrl
    });

    await query(
      `
        UPDATE civic_issues
        SET ai_status = 'completed',
            ai_category = $1,
            ai_severity = $2,
            ai_confidence = $3,
            ai_summary = $4,
            priority = CASE
              WHEN $2 = 'critical' THEN 'critical'
              WHEN $2 = 'high' THEN 'high'
              ELSE priority
            END,
            ai_processed_at = NOW(),
            updated_at = NOW()
        WHERE id = $5
      `,
      [
        analysis.category,
        analysis.severity,
        analysis.confidence,
        analysis.summary,
        issueId
      ]
    );

    await job.delete();
    end({ status: "completed" });
    aiJobsTotal.inc({ provider: config.queue.provider, status: "completed" });
    console.log(`Processed AI image-analysis job for issue ${issueId}`);
  } catch (error) {
    end({ status: "failed" });
    aiJobsTotal.inc({ provider: config.queue.provider, status: "failed" });
    throw error;
  }
};

const startMetricsServer = () => {
  const server = createServer(async (request, response) => {
    if (request.url !== "/metrics") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": registry.contentType
    });
    response.end(await registry.metrics());
  });

  server.listen(config.workerMetricsPort, () => {
    console.log(`CivicFix AI worker metrics listening on port ${config.workerMetricsPort}`);
  });
};

const run = async () => {
  await ensureQueueReady();
  startMetricsServer();

  console.log(
    `CivicFix AI worker started with queue provider '${config.queue.provider}'`
  );

  while (true) {
    const job = await receiveImageAnalysisJob();

    if (!job) {
      await sleep(config.queue.pollIntervalMs);
      continue;
    }

    try {
      await processJob(job);
    } catch (error) {
      console.error("Failed to process AI image-analysis job", error);

      if (job.payload?.issueId) {
        await updateIssueAsFailed(job.payload.issueId, error);
      }
    }
  }
};

run().catch((error) => {
  console.error("CivicFix AI worker crashed", error);
  process.exit(1);
});
