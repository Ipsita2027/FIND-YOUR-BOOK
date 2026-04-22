import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { books } from "../db/schema.js";

const nonEmptyText = (label, max = 180) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const createBookPayloadSchema = createInsertSchema(books, {
  title: () => nonEmptyText("title"),
  author: () => nonEmptyText("author"),
  isbn: () => nonEmptyText("isbn", 32),
  category: () => nonEmptyText("category"),
  floor: () => nonEmptyText("floor", 32),
  section: () => nonEmptyText("section"),
  shelf: () => nonEmptyText("shelf", 32),
  status: () => z.enum(["available", "checked-out"]).default("available")
}).pick({
  title: true,
  author: true,
  isbn: true,
  category: true,
  floor: true,
  section: true,
  shelf: true,
  status: true
});

export { createBookPayloadSchema };
