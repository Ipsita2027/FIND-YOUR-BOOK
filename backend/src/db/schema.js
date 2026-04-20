import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

const books = pgTable("books", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn").notNull().unique(),
  category: text("category").notNull(),
  floor: text("floor").notNull(),
  section: text("section").notNull(),
  shelf: text("shelf").notNull(),
  callNumber: text("call_number").notNull(),
  status: text("status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export { books };
