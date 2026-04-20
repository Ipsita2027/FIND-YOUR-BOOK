import { Router } from "express";
import { csvUpload, handleCsvUploadError } from "../middleware/csvUpload.js";

function createBookRoutes(bookController, requireAdminAuth) {
  const router = Router();

  router.get("/categories", bookController.getCategories);
  router.get("/books", bookController.getBooks);
  router.post("/books", requireAdminAuth, bookController.createBook);
  router.post(
    "/books/import/csv",
    requireAdminAuth,
    csvUpload.single("file"),
    handleCsvUploadError,
    bookController.importBooksFromCsv
  );

  return router;
}

export { createBookRoutes };
