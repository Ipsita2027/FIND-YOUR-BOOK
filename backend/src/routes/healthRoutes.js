import { Router } from "express";
import { getHealth } from "../controllers/healthController.js";

function createHealthRoutes() {
  const router = Router();
  router.get("/health", getHealth);
  return router;
}

export { createHealthRoutes };
