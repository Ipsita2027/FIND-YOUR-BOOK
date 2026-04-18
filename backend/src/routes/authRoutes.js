import { Router } from "express";

function createAuthRoutes(authController) {
    const router = Router();

    router.post("/auth/login-admin", authController.loginAdmin);

    return router;
}

export { createAuthRoutes };

