import { clerkMiddleware } from "@clerk/express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express, { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import morgan from "morgan";

// Import routes
import { disconnectPrisma } from "@/lib/prisma";
import adminRoutes from "./routes/admin.routes";
import driverRoutes from "./routes/driver.routes";
import ridesRoutes from "./routes/rides.routes";
import userRoutes from "./routes/user.routes";

// Create Express app
const app: express.Application = express();

// Define custom error interface
interface CustomError extends Error {
  statusCode?: number;
  status?: string;
}

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(clerkMiddleware());
app.use(express.urlencoded({ extended: true }));

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// --- API ROUTES ---
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/rides', ridesRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 handler middleware
app.use((req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Global error handling middleware
const errorHandler: ErrorRequestHandler = (err: CustomError, req: Request, res: Response, next: NextFunction): void => {
  err.statusCode = err.statusCode ?? 500;
  err.status = err.status ?? "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};

app.use(errorHandler);


const PORT: string | number = process.env.PORT ?? 3000;

app.listen(PORT, (): void => {
  console.log(`Server started at port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await disconnectPrisma();
  process.exit(0);
});

export default app;
