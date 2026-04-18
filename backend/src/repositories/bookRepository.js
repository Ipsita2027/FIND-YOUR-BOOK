import { mapBookRow } from "../utils/bookMapper.js";

class BookRepository {
  constructor(db) {
    this.db = db;
  }

  async getAllBooks() {
    const rows = await this.db.all("SELECT * FROM books");
    return rows.map(mapBookRow);
  }

  async getCategories() {
    const rows = await this.db.all("SELECT DISTINCT category FROM books ORDER BY category ASC");
    return rows.map((row) => row.category);
  }

  async createBook(book) {
    const result = await this.db.run(
      `
        INSERT INTO books (title, author, isbn, category, floor, section, shelf, call_number, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        book.title,
        book.author,
        book.isbn,
        book.category,
        book.floor,
        book.section,
        book.shelf,
        book.callNumber,
        book.status
      ]
    );

    const row = await this.db.get("SELECT * FROM books WHERE id = ?", [result.lastID]);
    return mapBookRow(row);
  }
}

function createBookRepository(db) {
  return new BookRepository(db);
}

export { BookRepository, createBookRepository };
