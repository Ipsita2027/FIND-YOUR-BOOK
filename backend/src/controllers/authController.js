class AuthController {
	constructor(adminAuth, adminService) {
		this.adminAuth = adminAuth;
		this.adminService = adminService;
		this.loginAdmin = this.loginAdmin.bind(this);
		this.changePassword = this.changePassword.bind(this);
		this.listAdmins = this.listAdmins.bind(this);
	}

	async loginAdmin(req, res, next) {
		try {
			const { username = "", password = "" } = req.body || {};

			if (!String(username).trim() || !String(password).trim()) {
				const error = new Error("username and password are required.");
				error.status = 400;
				throw error;
			}

			const isValid = await this.adminAuth.validateCredentials(username, password);
			if (!isValid) {
				const error = new Error("Invalid admin credentials.");
				error.status = 401;
				throw error;
			}

			const token = this.adminAuth.issueToken(username);
			res.json({
				token,
				tokenType: "Bearer",
				expiresIn: this.adminAuth.tokenTtlSeconds
			});
		} catch (error) {
			next(error);
		}
	}

	async changePassword(req, res, next) {
		try {
			const { oldPassword = "", newPassword = "" } = req.body || {};

			if (!String(oldPassword).trim() || !String(newPassword).trim()) {
				const error = new Error("oldPassword and newPassword are required.");
				error.status = 400;
				throw error;
			}

			const username = req.admin?.username;
			if (!username) {
				const error = new Error("Not authenticated.");
				error.status = 401;
				throw error;
			}

			await this.adminService.changePassword(username, oldPassword, newPassword);

			res.json({
				message: "Password changed successfully."
			});
		} catch (error) {
			next(error);
		}
	}

	async listAdmins(req, res, next) {
		try {
			const adminsList = await this.adminService.listAdmins();
			res.json(adminsList);
		} catch (error) {
			next(error);
		}
	}
}

function createAuthController(adminAuth, adminService) {
	return new AuthController(adminAuth, adminService);
}

export { AuthController, createAuthController };
