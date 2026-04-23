import { mapBookRow } from "../utils/bookMapper.js";
import { asc } from "drizzle-orm";
import { books } from "../db/schema.js";

class BookRepository {
  constructor(db) {
    this.db = db;
  }

  async getAllBooks() {
    const rows = await this.db.select().from(books);
    return rows.map(mapBookRow);
  }

  async getCategories() {
    const rows = await this.db
      .selectDistinct({ category: books.category })
      .from(books)
      .orderBy(asc(books.category));

    return rows.map((row) => row.category);
  }

  async createBook(book) {
    const [row] = await this.db.insert(books).values(book).returning();
    return mapBookRow(row);
  }

  async createBooksBulk(bookRows) {
    if (!Array.isArray(bookRows) || bookRows.length === 0) {
      return [];
    }

    const rows = await this.db.insert(books).values(bookRows).returning();
    return rows.map(mapBookRow);
  }

//   async deleteBook(bookId) {
//     const result = await this.db.delete(books).where(books.id === bookId);
//     return result.rowCount > 0;
//   }
}

function createBookRepository(db) {
  return new BookRepository(db);
}

export { BookRepository, createBookRepository };
