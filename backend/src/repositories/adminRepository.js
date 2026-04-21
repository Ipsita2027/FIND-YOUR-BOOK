import { admins } from "../db/schema.js";
import { eq } from "drizzle-orm";

class AdminRepository {
  constructor(db) {
    this.db = db;
  }

  async getByUsername(username) {
    const [admin] = await this.db
      .select()
      .from(admins)
      .where(eq(admins.username, username));

    return admin || null;
  }

  async create(username, passwordHash) {
    const [created] = await this.db
      .insert(admins)
      .values({ username, passwordHash })
      .returning();

    return created;
  }

  async updatePassword(username, passwordHash) {
    const [updated] = await this.db
      .update(admins)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(admins.username, username))
      .returning();

    return updated;
  }

  async listAll() {
    const rows = await this.db.select().from(admins);
    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }
}

function createAdminRepository(db) {
  return new AdminRepository(db);
}

export { AdminRepository, createAdminRepository };
