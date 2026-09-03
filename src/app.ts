import express, { Application } from "express";
import { initializedDB } from "./configs/initDB.js";
import userRouter from "./routes/user.routes.js";
import { AppError } from "./utils/AppError.js";
import { Request, Response, NextFunction } from "express";
import { globalErrorMiddleware } from "./middlewares/error.middleware.js";

const app: Application = express();

app.use(express.json());

await initializedDB();

app.use("/api/v1/auth", userRouter);

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
