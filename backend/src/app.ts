import express, { Application } from "express";
import userRouter from "./routes/user.routes.js";
import { AppError } from "./utils/AppError.js";
import { Request, Response, NextFunction } from "express";
import { globalErrorMiddleware } from "./middlewares/error.middleware.js";
import projectRouter from "./routes/project.routes.js";
import telemetryRouter from "./routes/telemetry.routes.js";
import analyticsRouter from "./routes/analytics.route.js";
import cors from "cors";
import { config } from "./configs/env.js";
import pool from "./configs/db.js";
import { sessionMiddleware } from "./utils/session.js";
import redisClient from "./utils/redis.js";
import adminRouter from "./routes/admin.routes.js";

const app: Application = express();

if (config.node_env === "production") {
  app.set("trust proxy", 1);
}

app.use(express.json());
app.use(sessionMiddleware);

//cors configuration
const allowedOrigins = new Set(
  [...config.cors_origins.split(","), config.frontend_url]
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin),
);

//cors first
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

//health check route
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await Promise.all([pool.query("SELECT 1"), redisClient.ping()]);
    res.status(200).json({
      status: "UP",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: "DOWN",
      timestamp: new Date().toISOString(),
    });
  }
});

//for authentication routes
app.use("/api/v1/auth", userRouter);

// Separate, server-authorized Super Admin API.
app.use("/api/v1/admin", adminRouter);

//for project routes
app.use("/api/v1/projects", projectRouter);

//for telemety routes
app.use("/api/v1/telemetry", telemetryRouter);

//for analytics routes
app.use("/api/v1/telemetry/analytics", analyticsRouter);

//for wrong path - it will throw error
app.all("*paths", (req: Request, res: Response, next: NextFunction) => {
  return next(
    new AppError(
      `no matching route found please check your url:${req.originalUrl}`,
      404,
    ),
  );
});
app.use(globalErrorMiddleware);

export default app;
