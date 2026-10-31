// Tabla usuarios.
import { db } from "../db.js";

export async function crear({ nombre, email, telefono, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO usuarios (nombre, email, telefono, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nombre, email, telefono, rol`,
    [nombre, email, telefono, passwordHash]
  );
  return rows[0];
}

// Para el login: incluye el hash y si la cuenta está activa.
export async function buscarParaLogin(email) {
  const { rows } = await db.query(
    `SELECT id, nombre, email, telefono, rol, password_hash, activo
       FROM usuarios WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

export async function buscarActivo(id) {
  const { rows } = await db.query(
    `SELECT id, nombre, email, telefono, rol
       FROM usuarios WHERE id = $1 AND activo = TRUE`,
    [id]
  );
  return rows[0] || null;
}

export async function buscarPorEmail(email) {
  const { rows } = await db.query(`SELECT id, nombre, email FROM usuarios WHERE email = $1`, [email]);
  return rows[0] || null;
}

// `conexion` permite consultarlo dentro de la transacción de un pedido.
export async function buscarEstado(id, conexion = db) {
  const { rows } = await conexion.query(`SELECT id, activo FROM usuarios WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function cambiarPassword(id, passwordHash) {
  await db.query(`UPDATE usuarios SET password_hash = $1 WHERE id = $2`, [passwordHash, id]);
}

// Listado del panel, con la actividad de cada cliente. Nunca devuelve
// password_hash: el hash no le sirve a nadie en la interfaz.
export async function listarConActividad() {
  const { rows } = await db.query(
    `SELECT
       u.id, u.nombre, u.email, u.telefono, u.rol, u.activo, u.creado_en,
       COUNT(p.id) FILTER (WHERE p.estado <> 'cancelado')               AS pedidos,
       COALESCE(SUM(p.total) FILTER (WHERE p.estado <> 'cancelado'), 0) AS gastado,
       COUNT(p.id) FILTER (WHERE p.estado = 'pendiente')                AS pendientes
     FROM usuarios u
     LEFT JOIN pedidos p ON p.usuario_id = u.id
     GROUP BY u.id
     ORDER BY u.creado_en DESC`
  );
  return rows;
}

export async function cambiarActivo(id, activo) {
  const { rows } = await db.query(`UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING id, activo`, [activo, id]);
  return rows[0] || null;
}
