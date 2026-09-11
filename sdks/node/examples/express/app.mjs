import express from "express";

export function createExampleApplication(inflow) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  const api = express.Router();
  api.use(inflow.express({ routePrefix: "/api" }));
  api.get("/products/:id", (request, response) => {
    response.status(200).json({ id: request.params.id, available: true });
  });
  api.get("/orders/:id", (request, response) => {
    response.status(200).json({ id: request.params.id, state: "processing" });
  });
  app.use("/api", api);

  app.use(inflow.express());
  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });
  app.post("/checkout", (_request, response) => {
    response.status(201).json({ accepted: true });
  });
  app.get("/slow", async (_request, response) => {
    await new Promise((resolve) => setTimeout(resolve, 75));
    response.status(200).json({ delayed: true });
  });
  app.get("/error", async () => {
    await Promise.resolve();
    throw new Error("example application error");
  });
  app.use((error, _request, response, _next) => {
    void error;
    response.status(500).json({ error: "internal server error" });
  });
  app.use((_request, response) => {
    response.status(404).json({ error: "not found" });
  });

  return app;
}
