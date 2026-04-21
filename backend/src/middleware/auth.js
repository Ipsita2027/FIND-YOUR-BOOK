import crypto from "crypto";

function createHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function base64UrlEncode(value) {
    return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
    return Buffer.from(value, "base64url").toString("utf8");
}

function createAdminAuth(config = {}) {
    const secret = String(config.secret || process.env.ADMIN_TOKEN_SECRET || "find-your-book-dev-secret");
    const tokenTtlSeconds = Number(config.tokenTtlSeconds || process.env.ADMIN_TOKEN_TTL_SECONDS || 3600);
    const adminService = config.adminService;

    function signPayload(encodedPayload) {
        return crypto
            .createHmac("sha256", secret)
            .update(encodedPayload)
            .digest("base64url");
    }

    function issueToken(username) {
        const exp = Math.floor(Date.now() / 1000) + tokenTtlSeconds;
        const payload = {
            sub: username,
            role: "admin",
            exp
        };
        const encodedPayload = base64UrlEncode(JSON.stringify(payload));
        const signature = signPayload(encodedPayload);
        return `${encodedPayload}.${signature}`;
    }

    function verifyToken(token) {
        if (!token || !token.includes(".")) {
            throw createHttpError(401, "Invalid or missing auth token.");
        }

        const [encodedPayload, signature] = token.split(".");
        const expectedSignature = signPayload(encodedPayload);
        if (signature !== expectedSignature) {
            throw createHttpError(401, "Invalid or missing auth token.");
        }

        let payload;
        try {
            payload = JSON.parse(base64UrlDecode(encodedPayload));
        } catch (_error) {
            throw createHttpError(401, "Invalid or missing auth token.");
        }

        const now = Math.floor(Date.now() / 1000);
        if (!payload.exp || now >= payload.exp || payload.role !== "admin") {
            throw createHttpError(401, "Auth token expired or invalid.");
        }

        return payload;
    }

    async function validateCredentials(username, password) {
        if (!adminService) {
            throw new Error("AdminService not configured in auth middleware.");
        }

        return adminService.validateCredentials(username, password);
    }

    function requireAdminAuth(req, _res, next) {
        try {
            const header = req.get("Authorization") || "";
            const [, token] = header.match(/^Bearer\s+(.+)$/i) || [];
            const payload = verifyToken(token);
            req.admin = { username: payload.sub, role: payload.role };
            next();
        } catch (error) {
            next(error);
        }
    }

    return {
        issueToken,
        requireAdminAuth,
        validateCredentials,
        tokenTtlSeconds
    };
}

export { createAdminAuth };