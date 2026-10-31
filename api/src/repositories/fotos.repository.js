// Tabla fotos: las imágenes que suben los clientes, guardadas en la base.
import { db } from "../db.js";

// `conexion` permite guardarla dentro de la transacción del pedido.
export async function crear({ id, mime, datos }, conexion = db) {
  await conexion.query(`INSERT INTO fotos (id, mime, datos, bytes) VALUES ($1, $2, $3, $4)`, [
    id,
    mime,
    datos,
    datos.length,
  ]);
}

export async function buscar(id) {
  const { rows } = await db.query(`SELECT mime, datos FROM fotos WHERE id = $1`, [id]);
  return rows[0] || null;
}
