import client from "prom-client";

client.collectDefaultMetrics({
  prefix: "civicfix_"
});

export const registry = client.register;

export const httpRequestDuration = new client.Histogram({
  name: "civicfix_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

export const aiJobDuration = new client.Histogram({
  name: "civicfix_ai_job_duration_seconds",
  help: "AI image-analysis job processing duration in seconds",
  labelNames: ["provider", "status"],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60]
});

export const aiJobsTotal = new client.Counter({
  name: "civicfix_ai_jobs_total",
  help: "Total number of AI image-analysis jobs handled by the worker",
  labelNames: ["provider", "status"]
});

export const aiQueueEnqueueTotal = new client.Counter({
  name: "civicfix_ai_queue_enqueue_total",
  help: "Total number of AI image-analysis queue enqueue attempts",
  labelNames: ["provider", "status"]
});

export const observeHttpRequest = (request, response, next) => {
  const end = httpRequestDuration.startTimer();

  response.on("finish", () => {
    end({
      method: request.method,
      route: request.route?.path ?? request.path,
      status_code: String(response.statusCode)
    });
  });

  next();
};
