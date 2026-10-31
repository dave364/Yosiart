// Tabla usuarios.
import { db } from "../db.ts";
import type { Conexion, Usuario, UsuarioConClave, Rol } from "../tipos.ts";

export async function crear(datos: { nombre: string; email: string; telefono: string; passwordHash: string }): Promise<Usuario> {
  const { rows } = await db.query<Usuario>(
    `INSERT INTO usuarios (nombre, email, telefono, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nombre, email, telefono, rol`,
    [datos.nombre, datos.email, datos.telefono, datos.passwordHash]
  );
  return rows[0]!;
}

// Para el login: incluye el hash y si la cuenta está activa.
export async function buscarParaLogin(email: string): Promise<UsuarioConClave | null> {
  const { rows } = await db.query<UsuarioConClave>(
    `SELECT id, nombre, email, telefono, rol, password_hash, activo
       FROM usuarios WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

export async function buscarActivo(id: number): Promise<Usuario | null> {
  const { rows } = await db.query<Usuario>(
    `SELECT id, nombre, email, telefono, rol
       FROM usuarios WHERE id = $1 AND activo = TRUE`,
    [id]
  );
  return rows[0] || null;
}

export async function buscarPorEmail(email: string): Promise<Pick<Usuario, "id" | "nombre" | "email"> | null> {
  const { rows } = await db.query<Pick<Usuario, "id" | "nombre" | "email">>(
    `SELECT id, nombre, email FROM usuarios WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

// `conexion` permite consultarlo dentro de la transacción de un pedido.
export async function buscarEstado(id: number, conexion: Conexion = db): Promise<{ id: number; activo: boolean } | null> {
  const { rows } = await conexion.query<{ id: number; activo: boolean }>(`SELECT id, activo FROM usuarios WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function cambiarPassword(id: number, passwordHash: string): Promise<void> {
  await db.query(`UPDATE usuarios SET password_hash = $1 WHERE id = $2`, [passwordHash, id]);
}

// Una fila del listado del panel. Postgres devuelve los COUNT y SUM como texto.
export interface FilaCliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  rol: Rol;
  activo: boolean;
  creado_en: string;
  pedidos: string;
  gastado: string;
  pendientes: string;
}

// Listado del panel, con la actividad de cada cliente. Nunca devuelve
// password_hash: el hash no le sirve a nadie en la interfaz.
export async function listarConActividad(): Promise<FilaCliente[]> {
  const { rows } = await db.query<FilaCliente>(
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

export async function cambiarActivo(id: number, activo: boolean): Promise<{ id: number; activo: boolean } | null> {
  const { rows } = await db.query<{ id: number; activo: boolean }>(
    `UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING id, activo`,
    [activo, id]
  );
  return rows[0] || null;
}
