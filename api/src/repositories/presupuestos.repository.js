// Tabla presupuestos.
import { db } from "../db.js";

const normalizar = (p) => ({ ...p, precio: p.precio == null ? null : Number(p.precio) });

export async function crear(d, conexion = db) {
  const { rows } = await conexion.query(
    `INSERT INTO presupuestos
       (usuario_id, nombre, email, telefono, tipo, cantidad, fecha_evento, descripcion, fotos)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [d.usuarioId, d.nombre, d.email, d.telefono, d.tipo, d.cantidad, d.fecha, d.descripcion, JSON.stringify(d.fotos)]
  );
  return normalizar(rows[0]);
}

export async function listar(estado) {
  const { rows } = await db.query(
    `SELECT * FROM presupuestos WHERE ($1::text IS NULL OR estado = $1) ORDER BY creado_en DESC`,
    [estado]
  );
  return rows.map(normalizar);
}

// `precio` undefined = no tocarlo; null = borrarlo.
export async function responder(id, { estado, respuesta, precio }) {
  const { rows } = await db.query(
    `UPDATE presupuestos
        SET estado = $1,
            respuesta = COALESCE($2, respuesta),
            precio = CASE WHEN $3::boolean THEN $4 ELSE precio END
      WHERE id = $5
      RETURNING *`,
    [estado, respuesta ?? null, precio !== undefined, precio ?? null, id]
  );
  return rows[0] ? normalizar(rows[0]) : null;
}
