import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "../db.js";

const aqui = dirname(fileURLToPath(import.meta.url));
const sql = await readFile(join(aqui, "..", "schema.sql"), "utf8");

await pool.query(sql);
console.log("Tablas creadas correctamente.");
await pool.end();
