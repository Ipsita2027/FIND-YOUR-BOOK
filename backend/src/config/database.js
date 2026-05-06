import "dotenv/config";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { books, admins } from "../db/schema.js";

function connectDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to connect to Neon Postgres.");
  }

  const pool= new Pool({connectionString:databaseUrl});
  return drizzle(pool, { schema: { books, admins } });
}

export { connectDatabase };
