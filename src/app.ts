import express, { Application } from "express";
import { initializedDB } from "./configs/initDB.js";
import userRouter from "./routes/user.routes.js";
import { AppError } from "./utils/AppError.js";
import { Request, Response, NextFunction } from "express";
import { globalErrorMiddleware } from "./middlewares/error.middleware.js";
import projectRouter from "./routes/project.routes.js";
import telemetryRouter from "./routes/telemetry.routes.js";

const app: Application = express();

app.use(express.json());

//intializing db
await initializedDB();

//for authentication routes
app.use("/api/v1/auth", userRouter);

//for project routes
app.use("/api/v1/projects", projectRouter);

//for telemety routes
app.use("/api/v1/telemetry", telemetryRouter);

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
