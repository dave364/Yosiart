// Tabla fotos: las imágenes que suben los clientes, guardadas en la base.
import { db } from "../db.ts";
import type { Conexion } from "../tipos.ts";

export interface Foto {
  mime: string;
  datos: Buffer;
}

// `conexion` permite guardarla dentro de la transacción del pedido.
export async function crear({ id, mime, datos }: Foto & { id: string }, conexion: Conexion = db): Promise<void> {
  await conexion.query(`INSERT INTO fotos (id, mime, datos, bytes) VALUES ($1, $2, $3, $4)`, [
    id,
    mime,
    datos,
    datos.length,
  ]);
}

export async function buscar(id: string): Promise<Foto | null> {
  const { rows } = await db.query<Foto>(`SELECT mime, datos FROM fotos WHERE id = $1`, [id]);
  return rows[0] || null;
}
