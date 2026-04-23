const MIN_TERM_LENGTH = 2;

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
    ...tokenize(book.location.section),
    ...tokenize(book.location.shelf)
  ]);

  return [...terms];
}

function levenshteinDistance(a, b) {
  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarityScore(a, b) {
  if (!a || !b) {
    return 0;
  }

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

class BookSearchIndex {
  constructor(books = []) {
    this.books = [];
    this.booksById = new Map();
    this.index = new Map();
    this.setBooks(books);
  }

  static getInstance(books = []) {
    if (!BookSearchIndex.instance) {
      BookSearchIndex.instance = new BookSearchIndex(books);
      return BookSearchIndex.instance;
    }

    if (Array.isArray(books) && books.length > 0) {
      BookSearchIndex.instance.setBooks(books);
    }

    return BookSearchIndex.instance;
  }

  setBooks(books = []) {
    this.books = [...books];
    this.booksById.clear();
    this.index.clear();

    for (const book of this.books) {
      this.indexBook(book);
    }
  }

  indexBook(book) {
    this.booksById.set(book.id, book);
    const terms = uniqueTermsFromBook(book);

    for (const term of terms) {
      if (!this.index.has(term)) {
        this.index.set(term, new Set());
      }
      this.index.get(term).add(book.id);
    }
  }

  addBook(book) {
    const existingIndex = this.books.findIndex((currentBook) => currentBook.id === book.id);
    if (existingIndex >= 0) {
      this.books[existingIndex] = book;
      this.setBooks(this.books);
      return;
    }

    this.books.push(book);
    this.indexBook(book);
  }

  removeBook(bookId) {
    // Remove book from booksById map
    this.booksById.delete(bookId);

    // Remove book from books array
    const bookIndex = this.books.findIndex((book) => book.id === bookId);
    if (bookIndex >= 0) {
      this.books.splice(bookIndex, 1);
    }

    // Remove book ID from all index entries
    for (const [_term, ids] of this.index.entries()) {
      ids.delete(bookId);
    }
  }

  search(query, category = "") {
    const queryTerms = tokenize(query);
    const categoryFilter = normalizeText(category);

    if (queryTerms.length === 0) {
      return this.books
        .filter((book) => (categoryFilter ? normalizeText(book.category) === categoryFilter : true))
        .sort((a, b) => a.title.localeCompare(b.title));
    }

    const scores = new Map();

    for (const queryTerm of queryTerms) {
      const exactMatches = this.index.get(queryTerm) || new Set();

      for (const id of exactMatches) {
        scores.set(id, (scores.get(id) || 0) + 5);
      }

      for (const [term, ids] of this.index.entries()) {
        if (term === queryTerm) {
          continue;
        }

        if (term.startsWith(queryTerm) || queryTerm.startsWith(term)) {
          for (const id of ids) {
            scores.set(id, (scores.get(id) || 0) + 2);
          }
        }
      }
    }

    for (const [id, book] of this.booksById.entries()) {
      const bookTerms = uniqueTermsFromBook(book);
      let fuzzyAggregate = 0;

      for (const queryTerm of queryTerms) {
        let bestTermSimilarity = 0;

        for (const term of bookTerms) {
          const score = similarityScore(queryTerm, term);
          if (score > bestTermSimilarity) {
            bestTermSimilarity = score;
          }
        }

        if (bestTermSimilarity >= 0.72) {
          fuzzyAggregate += bestTermSimilarity * 3;
        }
      }

      const fullText = normalizeText([
        book.title,
        book.author,
        book.isbn,
        book.category,
        book.location.section
      ].join(" "));

      if (normalizeText(query) && fullText.includes(normalizeText(query))) {
        fuzzyAggregate += 3;
      }

      if (fuzzyAggregate > 0) {
        scores.set(id, (scores.get(id) || 0) + fuzzyAggregate);
      }
    }

    return [...scores.entries()]
      .map(([id, score]) => ({ book: this.booksById.get(id), score }))
      .filter(({ book }) => (categoryFilter ? normalizeText(book.category) === categoryFilter : true))
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.book.title.localeCompare(b.book.title);
      })
      .map(({ book }) => book);
  }
}

function createBookSearchIndex(books) {
  return BookSearchIndex.getInstance(books);
}

export { BookSearchIndex, createBookSearchIndex, normalizeText };
