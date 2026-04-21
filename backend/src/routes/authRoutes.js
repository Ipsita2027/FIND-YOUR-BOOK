import { Router } from "express";

function createAuthRoutes(authController, requireAdminAuth) {
    const router = Router();

    router.post("/auth/login-admin", authController.loginAdmin);
    router.post("/auth/change-password", requireAdminAuth, authController.changePassword);
    router.get("/auth/admins", requireAdminAuth, authController.listAdmins);

    return router;
}

export { createAuthRoutes };

