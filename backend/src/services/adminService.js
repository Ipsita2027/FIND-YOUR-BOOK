import bcrypt from "bcrypt";

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class AdminService {
  constructor(adminRepository) {
    this.adminRepository = adminRepository;
  }

  async validateCredentials(username, password) {
    const admin = await this.adminRepository.getByUsername(username);

    if (!admin) {
      return false;
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    return isValid;
  }

  async changePassword(username, oldPassword, newPassword) {
    if (!String(newPassword).trim() || newPassword.length < 8) {
      throw createHttpError(400, "New password must be at least 8 characters.");
    }

    const isValid = await this.validateCredentials(username, oldPassword);
    if (!isValid) {
      throw createHttpError(401, "Current password is incorrect.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.adminRepository.updatePassword(username, passwordHash);
  }

  async listAdmins() {
    return this.adminRepository.listAll();
  }
}

function createAdminService(adminRepository) {
  return new AdminService(adminRepository);
}

export { AdminService, createAdminService };
