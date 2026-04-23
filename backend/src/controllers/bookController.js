class BookController {
  constructor(bookService) {
    this.bookService = bookService;

    // Ensure handlers keep controller context when passed to Express router.
    this.getCategories = this.getCategories.bind(this);
    this.getBooks = this.getBooks.bind(this);
    this.createBook = this.createBook.bind(this);
    // this.deleteBook = this.deleteBook.bind(this);
    this.importBooksFromCsv = this.importBooksFromCsv.bind(this);
  }
  // Below are the route handlers for this controller(3 of them)
  async getCategories(_req, res, next) {
    try {
      const categories = await this.bookService.listCategories();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  async getBooks(req, res, next) {
    try {
      const { query = "", category = "" } = req.query;
      const books = await this.bookService.searchBooks(query, category);
      res.json({
        total: books.length,
        query,
        category,
        books
      });
    } catch (error) {
      next(error);
    }
  }

  async createBook(req, res, next) {
    try {
      const book = await this.bookService.addBook(req.body || {});
      res.status(201).json(book);
    } catch (error) {
      next(error);
    }
  }

  // async deleteBook(req, res, next) {
  //   try {
  //     const bookId = parseInt(req.params.id, 10);
  //     if (isNaN(bookId)) {
  //       const error = new Error("Invalid book ID.");
  //       error.status = 400;
  //       throw error;
  //     }

  //     await this.bookService.deleteBook(bookId);
  //     res.status(204).send();
  //   } catch (error) {
  //     next(error);
  //   }
  // }

  async importBooksFromCsv(req, res, next) {
    try {
      const result = await this.bookService.importBooksFromCsv(req.file);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
}

function createBookController(bookService) {
  return new BookController(bookService);
}

export { BookController, createBookController };
