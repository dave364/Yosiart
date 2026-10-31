import pg from "pg";
import type { PoolClient, QueryResultRow } from "pg";
import type { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "node:async_hooks";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL en las variables de entorno.");
  throw new Error("Falta DATABASE_URL");
}

// En Cloudflare Workers una conexion abierta durante un pedido no se puede
// usar en el siguiente. Por eso ahi cada pedido abre su propio grupo de
// conexiones (ver conexionPorPedido) y lo cierra al terminar. En Node (tu
// PC, los scripts) se usa un solo grupo para toda la vida del proceso.
export const EN_WORKER =
  (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent === "Cloudflare-Workers";

const crearPool = () =>
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Los Postgres gestionados (Neon) exigen SSL.
    ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
    max: EN_WORKER ? 2 : 10,
  });

const porPedido = new AsyncLocalStorage<pg.Pool>();
let poolProceso: pg.Pool | null = null;

const poolActual = (): pg.Pool => {
  const delPedido = porPedido.getStore();
  if (delPedido) return delPedido;
  if (EN_WORKER) throw new Error("Consulta a la base fuera de un pedido.");
  return (poolProceso ??= crearPool());
};

// Middleware: en Cloudflare abre las conexiones de este pedido y las
// cierra cuando se termino de responder.
export function conexionPorPedido(_req: Request, res: Response, next: NextFunction) {
  if (!EN_WORKER) return next();
  const p = crearPool();
  let cerrado = false;
  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    p.end().catch(() => {});
  };
  res.on("finish", cerrar);
  res.on("close", cerrar);
  porPedido.run(p, next);
}

// Para los scripts (setup, seed), que corren en Node.
export const pool = {
  query: (text: string, params?: unknown[]) => poolActual().query(text, params),
  end: () => (poolProceso ? poolProceso.end() : Promise.resolve()),
};

export const query = <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) =>
  poolActual().query<T>(text, params);

// Lo que usan los repositorios: db.query(...) o, dentro de una
// transaccion, la conexion que reciben de withTransaction.
export const db = { query };

// Ejecuta varias consultas dentro de una transaccion.
// Si algo falla, se revierte todo.
export async function withTransaction<T>(fn: (conexion: PoolClient) => Promise<T>): Promise<T> {
  const client = await poolActual().connect();
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
