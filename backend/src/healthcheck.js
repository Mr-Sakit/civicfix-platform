import http from "node:http";

const port = Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 4000);

const request = http.request(
  {
    hostname: "127.0.0.1",
    port,
    path: "/health",
    method: "GET",
    timeout: 3000
  },
  (response) => {
    if (response.statusCode === 200) {
      process.exit(0);
    }

    process.exit(1);
  }
);

request.on("error", () => process.exit(1));
request.on("timeout", () => {
  request.destroy();
  process.exit(1);
});

request.end();
