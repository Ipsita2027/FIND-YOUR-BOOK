import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, "..", "..", "library.db");

async function connectDatabase() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

export { connectDatabase };
