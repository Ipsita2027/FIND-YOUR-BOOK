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
  callNumber: () => nonEmptyText("callNumber", 64),
  status: () => z.enum(["available", "checked-out"]).default("available")
}).omit({
  id: true,
  createdAt: true
});

export { createBookPayloadSchema };
