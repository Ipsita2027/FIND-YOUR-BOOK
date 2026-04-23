import { seedBooks } from "../data/seedBooks.js";
import { count, eq } from "drizzle-orm";
import { books, admins } from "../db/schema.js";
import bcrypt from "bcrypt";

async function seedIfEmpty(db) {
  const [{ value }] = await db.select({ value: count() }).from(books);

  if (value > 0) {
    return;
  }

  await db.insert(books).values(
    seedBooks.map((book) => ({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      floor: book.floor,
      section: book.section,
      shelf: book.shelf,
      status: book.status || "available"
    }))
  );
}

async function seedAdminIfNotExists(db) {
  const adminUsername = String(process.env.ADMIN_USERNAME);
  const adminPassword = String(process.env.ADMIN_PASSWORD);

  const existing = await db
    .select()
    .from(admins)
    .where(eq(admins.username, adminUsername));

  if (existing && existing.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await db.insert(admins).values({
    username: adminUsername,
    passwordHash
  });
}

async function initializeDatabase(db) {
  try {
    await seedIfEmpty(db);
    await seedAdminIfNotExists(db);
  } catch (error) {
    if (error?.code === "42P01") {
      throw new Error(
        "Database schema is missing. Run Drizzle migrations before starting the API."
      );
    }

    throw error;
  }
}

export { initializeDatabase };
