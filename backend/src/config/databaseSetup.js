import { seedBooks } from "../data/seedBooks.js";
import { count } from "drizzle-orm";
import { books } from "../db/schema.js";

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
      callNumber: book.callNumber,
      status: book.status || "available"
    }))
  );
}

async function initializeDatabase(db) {
  try {
    await seedIfEmpty(db);
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
