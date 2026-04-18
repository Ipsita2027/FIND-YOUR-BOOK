class AuthController {
	constructor(adminAuth) {
		this.adminAuth = adminAuth;
		this.loginAdmin = this.loginAdmin.bind(this);
	}

	async loginAdmin(req, res, next) {
		try {
			const { username = "", password = "" } = req.body || {};

			if (!String(username).trim() || !String(password).trim()) {
				const error = new Error("username and password are required.");
				error.status = 400;
				throw error;
			}

			const isValid = this.adminAuth.validateAdminCredentials(username, password);
			if (!isValid) {
				const error = new Error("Invalid admin credentials.");
				error.status = 401;
				throw error;
			}

			const token = this.adminAuth.issueToken();
			res.json({
				token,
				tokenType: "Bearer",
				expiresIn: this.adminAuth.tokenTtlSeconds
			});
		} catch (error) {
			next(error);
		}
	}
}

function createAuthController(adminAuth) {
	return new AuthController(adminAuth);
}

export { AuthController, createAuthController };
