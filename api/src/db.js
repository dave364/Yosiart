import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL en las variables de entorno.");
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Los Postgres gestionados (Neon, Render) exigen SSL.
  ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
});

export const query = (text, params) => pool.query(text, params);

// Ejecuta varias consultas dentro de una transaccion.
// Si algo falla, se revierte todo.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
