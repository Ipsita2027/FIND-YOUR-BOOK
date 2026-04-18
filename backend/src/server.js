import { connectDatabase } from "./config/database.js";
import { initializeDatabase } from "./config/databaseSetup.js";
import { createBookRepository } from "./repositories/bookRepository.js";
import { createBookService } from "./services/bookService.js";
import { createBookController } from "./controllers/bookController.js";
import { createAuthController } from "./controllers/authController.js";
import { createApp } from "./app.js";
import { createBookSearchIndex } from "./searchIndex.js";
import { createAdminAuth } from "./middleware/auth.js";

const PORT = process.env.PORT || 4000;

async function startServer() {
  const db = await connectDatabase();
  await initializeDatabase(db);

  const bookRepository = createBookRepository(db);
  const bookSearchIndex = createBookSearchIndex();
  const bookService = createBookService(bookRepository, bookSearchIndex);
  await bookService.initialize();
  const bookController = createBookController(bookService);
  const adminAuth = createAdminAuth();
  const authController = createAuthController(adminAuth);

  const app = createApp(bookController, authController, adminAuth.requireAdminAuth);

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Find Your Book backend running on http://localhost:${PORT}`);
  });
}

try {
  await startServer();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  process.exit(1);
}
