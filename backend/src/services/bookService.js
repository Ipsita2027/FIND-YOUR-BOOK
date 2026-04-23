import { normalizeText } from "../searchIndex.js";
import { createBookPayloadSchema } from "../validation/bookSchemas.js";
import { parse } from "csv-parse/sync";

const MAX_IMPORT_ROWS = 2000;
const REQUIRED_COLUMNS = ["title", "author", "isbn", "category", "floor", "section", "shelf"];
const OPTIONAL_COLUMNS = ["status"];
const ALLOWED_COLUMNS = new Set([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]);

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function toCanonicalRecord(record) {
  return {
    title: record.title,
    author: record.author,
    isbn: record.isbn,
    category: record.category,
    floor: record.floor,
    section: record.section,
    shelf: record.shelf,
    status: record.status
  };
}

function extractErrorMessages(zodError) {
  return zodError.issues.map((issue) => issue.message);
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class BookService {
  constructor(bookRepository, bookSearchIndex) {
    this.bookRepository = bookRepository;
    this.index = bookSearchIndex;
  }

  async refreshSearchIndex() {
    const books = await this.bookRepository.getAllBooks();
    await this.index.setBooks(books);
  }

  validateCreateBookInput(payload) {
    const candidate = {
      title: payload?.title,
      author: payload?.author,
      isbn: payload?.isbn,
      category: payload?.category,
      floor: payload?.floor,
      section: payload?.section,
      shelf: payload?.shelf,
      status: payload?.status
    };

    const parsed = createBookPayloadSchema.safeParse(candidate);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => issue.message).join("; ");
      throw createHttpError(400, details || "Invalid request body.");
    }

    const validated = {
      ...parsed.data,
      status: normalizeText(parsed.data.status)
    };

    return {
      ...validated,
      category: normalizeText(validated.category)
    };
  }

  parseCsvFile(file) {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw createHttpError(400, "A non-empty CSV file is required.");
    }

    const headerTracker = {
      seen: new Set()
    };

    let records;
    try {
      records = parse(file.buffer, {
        bom: true,
        skip_empty_lines: true,
        trim: true,
        columns: (headers) => headers.map((rawHeader) => {
          const header = normalizeHeader(rawHeader);

          if (!header) {
            throw createHttpError(400, "CSV contains empty column headers.");
          }

          if (!ALLOWED_COLUMNS.has(header)) {
            throw createHttpError(400, `Unsupported CSV column: ${rawHeader}`);
          }

          if (headerTracker.seen.has(header)) {
            throw createHttpError(400, `Duplicate CSV column: ${rawHeader}`);
          }

          headerTracker.seen.add(header);
          return header;
        })
      });
    } catch (error) {
      if (error.status) {
        throw error;
      }

      throw createHttpError(400, "Invalid CSV format.");
    }

    const missingColumns = REQUIRED_COLUMNS.filter((column) => !headerTracker.seen.has(column));
    if (missingColumns.length > 0) {
      throw createHttpError(400, `CSV is missing required columns: ${missingColumns.join(", ")}`);
    }

    if (!Array.isArray(records) || records.length === 0) {
      throw createHttpError(400, "CSV file has no data rows.");
    }

    if (records.length > MAX_IMPORT_ROWS) {
      throw createHttpError(400, `CSV row limit exceeded. Max rows allowed: ${MAX_IMPORT_ROWS}.`);
    }

    return records;
  }

  validateImportRows(records) {
    const errors = [];
    const isbnSeen = new Set();
    const validRows = [];

    records.forEach((record, index) => {
      const rowNumber = index + 2;
      const candidate = toCanonicalRecord(record);
      const parsed = createBookPayloadSchema.safeParse(candidate);

      if (!parsed.success) {
        errors.push({
          row: rowNumber,
          errors: extractErrorMessages(parsed.error)
        });
        return;
      }

      const normalized = {
        ...parsed.data,
        category: normalizeText(parsed.data.category),
        status: normalizeText(parsed.data.status)
      };

      if (isbnSeen.has(normalized.isbn)) {
        errors.push({
          row: rowNumber,
          errors: ["Duplicate ISBN in CSV payload."]
        });
        return;
      }

      isbnSeen.add(normalized.isbn);
      validRows.push(normalized);
    });

    return {
      errors,
      validRows
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
      await this.index.addBook(created);
      return created;
    } catch (error) {
      if (error?.code === "23505" || String(error.message).includes("books_isbn")) {
        throw createHttpError(409, "A book with this ISBN already exists.");
      }

      throw createHttpError(500, "Failed to add book.");
    }
  }

  async deleteBook(bookId) {
    try {
      // Delete from database (idempotent - doesn't fail if book doesn't exist)
      await this.bookRepository.deleteBook(bookId);
      
      // Remove from search index (idempotent - only removes if present)
      this.index.removeBook(bookId);
    } catch (error) {
      throw createHttpError(500, "Failed to delete book.");
    }
  }

  async importBooksFromCsv(file) {
    const records = this.parseCsvFile(file);
    const { errors, validRows } = this.validateImportRows(records);

    if (errors.length > 0) {
      const error = createHttpError(400, "CSV validation failed.");
      error.details = {
        totalRows: records.length,
        invalidRows: errors.length,
        errors
      };
      throw error;
    }

    try {
      const inserted = await this.bookRepository.createBooksBulk(validRows);
      for (const book of inserted) {
        await this.index.addBook(book);
      }

      return {
        insertedCount: inserted.length,
        totalRows: records.length,
        inserted
      };
    } catch (error) {
      if (error?.code === "23505") {
        throw createHttpError(409, "CSV import failed because one or more ISBN values already exist.");
      }

      throw createHttpError(500, "Failed to import books from CSV.");
    }
  }
}

function createBookService(bookRepository, bookSearchIndex) {
  return new BookService(bookRepository, bookSearchIndex);
}

export { BookService, createBookService };
