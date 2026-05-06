import { SCHEMA_FIELD_TYPE } from "redis";
import { createRedisClient } from "./config/redis.js";

const MIN_TERM_LENGTH = 2;
const INDEX_NAME = "idx:books:v2";
const DOC_PREFIX = "book:";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((part) => part.length >= MIN_TERM_LENGTH);
}

function uniqueTermsFromBook(book) {
  const terms = new Set([
    ...tokenize(book.title),
    ...tokenize(book.author),
    ...tokenize(book.isbn),
    ...tokenize(book.category),
    ...tokenize(book.location.floor),
    ...tokenize(book.location.section),
    ...tokenize(book.location.shelf)
  ]);

  return [...terms];
}

function escapeSearchTerm(term) {
  return String(term || "").replace(/([@{}\[\]"'|()~:\-*\\])/g, "\\$1");
}

function escapeTagValue(value) {
  return String(value || "")
    .replace(/([@{}\[\]|,:\\])/g, "\\$1")
    .replace(/\s/g, "\\ ");
}

function toRedisBookDocument(book) {
  const normalizedCategory = normalizeText(book.category);
  const normalizedStatus = normalizeText(book.status);
  const terms = uniqueTermsFromBook(book);

  return {
    id: String(book.id),
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    category: normalizedCategory,
    floor: book.location.floor,
    section: book.location.section,
    shelf: book.location.shelf,
    status: normalizedStatus,
    terms: terms.join(","),
    searchText: normalizeText([
      book.title,
      book.author,
      book.isbn,
      normalizedCategory,
      book.location.floor,
      book.location.section,
      book.location.shelf
    ].join(" "))
  };
}

function fromRedisBookDocument(document) {
  const value = document.value || {};

  return {
    id: Number(value.id),
    title: value.title,
    author: value.author,
    isbn: value.isbn,
    category: value.category,
    status: value.status,
    location: {
      floor: value.floor,
      section: value.section,
      shelf: value.shelf
    }
  };
}

class BookSearchIndex {
  constructor() {
    this.client = createRedisClient();
    this.indexInitialized = false;
  }

  static getInstance() {
    if (!BookSearchIndex.instance) {
      BookSearchIndex.instance = new BookSearchIndex();
    }

    return BookSearchIndex.instance;
  }

  async ensureConnected() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async ensureIndex() {
    if (this.indexInitialized) {
      return;
    }

    await this.ensureConnected();

    try {
      await this.client.ft.info(INDEX_NAME);
      this.indexInitialized = true;
      return;
    } catch {
      // Index does not exist yet, create it below.
    }

    await this.client.ft.create(
      INDEX_NAME,
      {
        id: { type: SCHEMA_FIELD_TYPE.NUMERIC, SORTABLE: true },
        title: { type: SCHEMA_FIELD_TYPE.TEXT, WEIGHT: 5, SORTABLE: true },
        author: { type: SCHEMA_FIELD_TYPE.TEXT, WEIGHT: 3 },
        isbn: { type: SCHEMA_FIELD_TYPE.TEXT, WEIGHT: 4 },
        category: { type: SCHEMA_FIELD_TYPE.TAG, SORTABLE: true },
        floor: { type: SCHEMA_FIELD_TYPE.TEXT },
        section: { type: SCHEMA_FIELD_TYPE.TEXT },
        shelf: { type: SCHEMA_FIELD_TYPE.TEXT },
        status: { type: SCHEMA_FIELD_TYPE.TAG },
        terms: { type: SCHEMA_FIELD_TYPE.TAG },
        searchText: { type: SCHEMA_FIELD_TYPE.TEXT, WEIGHT: 2 }
      },
      {
        ON: "HASH",
        PREFIX: DOC_PREFIX
      }
    );

    this.indexInitialized = true;
  }

  async clearIndexedBooks() {
    const keys = await this.client.keys(`${DOC_PREFIX}*`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async setBooks(books = []) {
    await this.ensureIndex();
    await this.clearIndexedBooks();

    if (!Array.isArray(books) || books.length === 0) {
      return;
    }

    const transaction = this.client.multi();
    for (const book of books) {
      const key = `${DOC_PREFIX}${book.id}`;
      transaction.hSet(key, toRedisBookDocument(book));
    }

    await transaction.exec();
  }

  async indexBook(book) {
    await this.ensureIndex();
    const key = `${DOC_PREFIX}${book.id}`;
    await this.client.hSet(key, toRedisBookDocument(book));
  }

  async addBook(book) {
    await this.indexBook(book);
  }

  async indexBooksBatch(books) {
    await this.ensureIndex();

    if (!Array.isArray(books) || books.length === 0) {
      return;
    }

    const transaction = this.client.multi();
    for (const book of books) {
      const key = `${DOC_PREFIX}${book.id}`;
      transaction.hSet(key, toRedisBookDocument(book));
    }

    await transaction.exec();
  }

  async removeBook(bookId) {
    await this.ensureIndex();
    await this.client.del(`${DOC_PREFIX}${bookId}`);
  }

  buildQuery(rawQuery, rawCategory = "") {
    const queryTerms = tokenize(rawQuery);
    const category = normalizeText(rawCategory);
    const categoryClause = category ? `@category:{${escapeTagValue(category)}}` : "";

    if (queryTerms.length === 0) {
      return categoryClause || "*";
    }

    const termClauses = queryTerms.map((term) => {
      const escapedTermTag = escapeTagValue(term);
      const escapedTermText = escapeSearchTerm(term);

      const exact = `@terms:{${escapedTermTag}}`;
      const prefix = `@terms:{${escapedTermTag}*}`;
      const fuzzy = `@searchText:%${escapedTermText}%`;

      return `(${exact}|${prefix}|${fuzzy})`;
    });

    return [termClauses.join(" "), categoryClause].filter(Boolean).join(" ");
  }

  async search(query, category = "") {
    await this.ensureIndex();

    const hasSearchText = tokenize(query).length > 0;
    const searchQuery = this.buildQuery(query, category);

    const result = await this.client.ft.search(INDEX_NAME, searchQuery, {
      LIMIT: { from: 0, size: 50 },
      ...(hasSearchText ? {} : { SORTBY: "title" }),
      DIALECT: 2
    });

    const books = result.documents.map(fromRedisBookDocument);

    if (hasSearchText) {
      return books;
    }

    return books.sort((a, b) => a.title.localeCompare(b.title));
  }
}

function createBookSearchIndex() {
  return BookSearchIndex.getInstance();
}

export { BookSearchIndex, createBookSearchIndex, normalizeText };
