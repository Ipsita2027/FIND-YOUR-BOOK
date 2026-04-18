import { normalizeText } from "../searchIndex.js";

const ALLOWED_STATUS = ["available", "checked-out"];

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class BookService {
  constructor(bookRepository,bookSearchIndex) {
    this.bookRepository = bookRepository;
    this.index = bookSearchIndex;
  }

  async refreshSearchIndex() {
    const books = await this.bookRepository.getAllBooks();
    this.index.setBooks(books);
  }

  validateCreateBookInput(payload) {
    const requiredFields = {
      title: payload.title,
      author: payload.author,
      isbn: payload.isbn,
      category: payload.category,
      floor: payload.floor,
      section: payload.section,
      shelf: payload.shelf,
      callNumber: payload.callNumber,
      status: payload.status || "available"
    };

    const missing = Object.entries(requiredFields)
      .filter(([, value]) => !String(value || "").trim())
      .map(([key]) => key);

    if (missing.length > 0) {
      throw createHttpError(400, `Missing fields: ${missing.join(", ")}`);
    }

    const normalizedStatus = normalizeText(payload.status || "available");
    if (!ALLOWED_STATUS.includes(normalizedStatus)) {
      throw createHttpError(400, "status must be 'available' or 'checked-out'");
    }

    return {
      title: String(payload.title).trim(),
      author: String(payload.author).trim(),
      isbn: String(payload.isbn).trim(),
      category: String(payload.category).trim().toLowerCase(),
      floor: String(payload.floor).trim(),
      section: String(payload.section).trim(),
      shelf: String(payload.shelf).trim(),
      callNumber: String(payload.callNumber).trim(),
      status: normalizedStatus
    };
  }

  async initialize() {
    await this.refreshSearchIndex();
  }

  async listCategories() {
    return this.bookRepository.getCategories();
  }

  async searchBooks(query = "", category = "") {
    return this.index.search(String(query), String(category));
  }

  async addBook(payload) {
    const validated = this.validateCreateBookInput(payload);

    try {
      const created = await this.bookRepository.createBook(validated);
      this.index.addBook(created);
      return created;
    } catch (error) {
      if (String(error.message).includes("UNIQUE constraint failed: books.isbn")) {
        throw createHttpError(409, "A book with this ISBN already exists.");
      }

      throw createHttpError(500, "Failed to add book.");
    }
  }
}

function createBookService(bookRepository, bookSearchIndex) {
  return new BookService(bookRepository, bookSearchIndex);
}

export { BookService, createBookService };
