import { config } from "./config.js";
import { query } from "./db.js";
import { compareBeforeAfterPhotos } from "./gemini.js";
import { createServer } from "node:http";
import { aiJobDuration, aiJobsTotal, registry } from "./metrics.js";
import { ensureQueueReady, receiveImageAnalysisJob } from "./queue.js";
import { loadImageObject } from "./storage.js";

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

const insertNotification = async ({ userId, issueId, type, message }) => {
  if (!userId) return;
  await query(
    `INSERT INTO notifications (user_id, issue_id, type, message) VALUES ($1, $2, $3, $4)`,
    [userId, issueId, type, message]
  );
};

const insertNotificationForAdmins = async ({ issueId, type, message }) => {
  const admins = await query(
    `SELECT users.id FROM users JOIN roles ON roles.id = users.role_id WHERE roles.name = 'admin'`
  );
  for (const admin of admins.rows) {
    await insertNotification({ userId: admin.id, issueId, type, message });
  }
};

const loadPhotoBuffer = async (photoRow) => {
  if (!photoRow) return { buffer: null, mimeType: null };
  const buffer = await loadImageObject(photoRow.file_name);
  return { buffer, mimeType: photoRow.mime_type };
};

const processBeforeAfterCompare = async (job) => {
  const { issueId } = job.payload;

  const issue = await query(
    `SELECT title, description, reported_by FROM civic_issues WHERE id = $1`,
    [issueId]
  );
  if (issue.rowCount === 0) throw new Error(`Issue ${issueId} no longer exists`);

  const beforePhoto = await query(
    `SELECT file_name, mime_type FROM issue_photos WHERE issue_id = $1 AND photo_role = 'before' ORDER BY created_at ASC LIMIT 1`,
    [issueId]
  );
  const afterPhoto = await query(
    `SELECT file_name, mime_type FROM issue_photos WHERE issue_id = $1 AND photo_role = 'after' ORDER BY created_at DESC LIMIT 1`,
    [issueId]
  );

  const before = await loadPhotoBuffer(beforePhoto.rows[0]);
  const after = await loadPhotoBuffer(afterPhoto.rows[0]);

  const comparison = await compareBeforeAfterPhotos({
    beforeImageBuffer: before.buffer,
    beforeMimeType: before.mimeType,
    afterImageBuffer: after.buffer,
    afterMimeType: after.mimeType,
    issueDescription: issue.rows[0].description
  });

  if (comparison.resolved) {
    await query(
      `
        UPDATE civic_issues
        SET status = 'resolved',
            ai_photo_match = TRUE,
            ai_photo_match_confidence = $1,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
      `,
      [comparison.confidence, issueId]
    );
    await query(
      `INSERT INTO issue_status_history (issue_id, old_status, new_status, note) VALUES ($1, 'pending_ai_verification', 'resolved', $2)`,
      [issueId, `AI verified the fix: ${comparison.reason ?? "match confirmed"}`]
    );
    await insertNotification({
      userId: issue.rows[0].reported_by,
      issueId,
      type: "resolved",
      message: `Your report "${issue.rows[0].title}" has been resolved.`
    });
  } else {
    await query(
      `
        UPDATE civic_issues
        SET status = 'crew_accepted',
            ai_photo_match = FALSE,
            ai_photo_match_confidence = $1,
            updated_at = NOW()
        WHERE id = $2
      `,
      [comparison.confidence, issueId]
    );
    await query(
      `INSERT INTO issue_status_history (issue_id, old_status, new_status, note) VALUES ($1, 'pending_ai_verification', 'crew_accepted', $2)`,
      [issueId, `AI could not verify the fix: ${comparison.reason ?? "no match"}`]
    );
    await insertNotificationForAdmins({
      issueId,
      type: "ai_verification_failed",
      message: `AI could not verify the fix for "${issue.rows[0].title}" — sent back to the crew.`
    });
  }

  console.log(`Processed before/after AI verification for issue ${issueId}: resolved=${comparison.resolved}`);
};

const processJob = async (job) => {
  const end = aiJobDuration.startTimer({ provider: config.queue.provider });
  const { issueId } = job.payload;

  try {
    if (!Number.isInteger(Number(issueId))) {
      throw new Error("Queue message is missing a valid issueId");
    }

    await processBeforeAfterCompare(job);

    await job.delete();
    end({ status: "completed" });
    aiJobsTotal.inc({ provider: config.queue.provider, status: "completed" });
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
