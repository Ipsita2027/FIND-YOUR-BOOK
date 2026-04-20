// const path = require("path");
// const sqlite3 = require("sqlite3");
// const { open } = require("sqlite");
// const { seedBooks } = require("./data/seedBooks");

// const DB_PATH = path.join(__dirname, "..", "library.db");

// async function initializeDatabase() {
//   const db = await open({
//     filename: DB_PATH,
//     driver: sqlite3.Database
//   });

//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS books (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       title TEXT NOT NULL,
//       author TEXT NOT NULL,
//       isbn TEXT NOT NULL UNIQUE,
//       category TEXT NOT NULL,
//       floor TEXT NOT NULL,
//       section TEXT NOT NULL,
//       shelf TEXT NOT NULL,
//       call_number TEXT NOT NULL,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP
//     );
//   `);

//   const { count } = await db.get("SELECT COUNT(*) as count FROM books");
//   if (count === 0) {
//     const insertSQL = `
//       INSERT INTO books (
//         title, author, isbn, category, floor, section, shelf, call_number
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     for (const book of seedBooks) {
//       await db.run(insertSQL, [
//         book.title,
//         book.author,
//         book.isbn,
//         book.category,
//         book.floor,
//         book.section,
//         book.shelf,
//         book.callNumber,
//       ]);
//     }
//   }

//   return db;
// }

// function mapBookRow(row) {
//   return {
//     id: row.id,
//     title: row.title,
//     author: row.author,
//     isbn: row.isbn,
//     category: row.category,
//     location: {
//       floor: row.floor,
//       section: row.section,
//       shelf: row.shelf,
//       callNumber: row.call_number
//     },
//   };
// }

// module.exports = {
//   initializeDatabase,
//   mapBookRow
// };
