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

const app: Application = express();

app.use(express.json());

//cors configuration
const allowedOrigins = config.cors_origins
  .split(",")
  .map((origin) => origin.trim());

//cors first
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

//health check route
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

//for authentication routes
app.use("/api/v1/auth", userRouter);

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
