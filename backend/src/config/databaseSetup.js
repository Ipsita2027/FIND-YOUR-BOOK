import { seedBooks } from "../data/seedBooks.js";

async function createSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      floor TEXT NOT NULL,
      section TEXT NOT NULL,
      shelf TEXT NOT NULL,
      call_number TEXT NOT NULL,
      status TEXT DEFAULT "available",
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function seedIfEmpty(db) {
  const { count } = await db.get("SELECT COUNT(*) as count FROM books");
  if (count > 0) {
    return;
  }

  const insertSQL = `
    INSERT INTO books (
      title, author, isbn, category, floor, section, shelf, call_number, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const book of seedBooks) {
    await db.run(insertSQL, [
      book.title,
      book.author,
      book.isbn,
      book.category,
      book.floor,
      book.section,
      book.shelf,
      book.callNumber,
      book.status
    ]);
  }
}

async function initializeDatabase(db) {
  await createSchema(db);
  await seedIfEmpty(db);
}

export { initializeDatabase };
