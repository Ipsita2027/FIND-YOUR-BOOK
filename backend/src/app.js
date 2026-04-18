import express from "express";
import cors from "cors";
import { createBookRoutes } from "./routes/bookRoutes.js";
import { createHealthRoutes } from "./routes/healthRoutes.js";
import { createAuthRoutes } from "./routes/authRoutes.js";

function createApp(bookController, authController, requireAdminAuth) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api", createHealthRoutes());
  app.use("/api", createAuthRoutes(authController));
  app.use("/api", createBookRoutes(bookController, requireAdminAuth));

  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    const message = error.message || "Internal server error";
    res.status(status).json({ error: message });
  });

  return app;
}

export { createApp };
