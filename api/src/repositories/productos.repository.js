// Tabla productos (las piezas del catálogo).
import { db } from "../db.js";

const COLUMNAS = `id, slug, nombre, categoria, descripcion, precio, precios_tamano,
                  forma, formas, tamanos, lleva, nuevo, orden`;

// Numeric de Postgres llega como string; el front espera numeros.
const normalizar = (p) => ({ ...p, precio: p.precio == null ? null : Number(p.precio) });

const valores = (d) => [
  d.slug, d.nombre, d.categoria, d.descripcion, d.precio,
  JSON.stringify(d.precios_tamano), d.forma, JSON.stringify(d.formas),
  JSON.stringify(d.tamanos), JSON.stringify(d.lleva), d.nuevo, d.orden, d.activo,
];

export async function listarActivos() {
  const { rows } = await db.query(`SELECT ${COLUMNAS} FROM productos WHERE activo = TRUE ORDER BY orden, id`);
  return rows.map(normalizar);
}

export async function listarTodos() {
  const { rows } = await db.query(`SELECT ${COLUMNAS}, activo FROM productos ORDER BY orden, id`);
  return rows.map(normalizar);
}

export async function crear(d) {
  const { rows } = await db.query(
    `INSERT INTO productos
       (slug, nombre, categoria, descripcion, precio, precios_tamano,
        forma, formas, tamanos, lleva, nuevo, orden, activo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING ${COLUMNAS}, activo`,
    valores(d)
  );
  return normalizar(rows[0]);
}

export async function actualizar(id, d) {
  const { rows } = await db.query(
    `UPDATE productos
        SET slug=$1, nombre=$2, categoria=$3, descripcion=$4, precio=$5, precios_tamano=$6,
            forma=$7, formas=$8, tamanos=$9, lleva=$10, nuevo=$11, orden=$12, activo=$13
      WHERE id=$14
      RETURNING ${COLUMNAS}, activo`,
    [...valores(d), id]
  );
  return rows[0] ? normalizar(rows[0]) : null;
}

export async function desactivar(id) {
  const { rows } = await db.query(`UPDATE productos SET activo = FALSE WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

// Para armar un pedido: las piezas activas pedidas, dentro de su transacción.
export async function buscarActivosPorSlug(slugs, conexion = db) {
  const { rows } = await conexion.query(
    `SELECT id, slug, nombre, precio, precios_tamano, forma, formas, tamanos, lleva
       FROM productos
      WHERE slug = ANY($1::text[]) AND activo = TRUE`,
    [slugs]
  );
  return rows;
}
