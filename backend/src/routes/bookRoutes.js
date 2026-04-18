import { Router } from "express";

function createBookRoutes(bookController, requireAdminAuth) {
  const router = Router();

  router.get("/categories", bookController.getCategories);
  router.get("/books", bookController.getBooks);
  router.post("/books", requireAdminAuth, bookController.createBook);

  return router;
}

export { createBookRoutes };
