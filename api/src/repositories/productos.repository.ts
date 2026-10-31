// Tabla productos (las piezas del catálogo).
import { db } from "../db.ts";
import type { Conexion, Producto } from "../tipos.ts";
import type { DatosProducto } from "../schemas/productos.schema.ts";

const COLUMNAS = `id, slug, nombre, categoria, descripcion, precio, precios_tamano,
                  forma, formas, tamanos, lleva, nuevo, orden`;

// Así llega de Postgres: NUMERIC viene como texto.
type FilaProducto = Omit<Producto, "precio"> & { precio: string | null };

// El front espera numeros.
const normalizar = (p: FilaProducto): Producto => ({ ...p, precio: p.precio == null ? null : Number(p.precio) });

const valores = (d: DatosProducto) => [
  d.slug, d.nombre, d.categoria, d.descripcion, d.precio,
  JSON.stringify(d.precios_tamano), d.forma, JSON.stringify(d.formas),
  JSON.stringify(d.tamanos), JSON.stringify(d.lleva), d.nuevo, d.orden, d.activo,
];

export async function listarActivos(): Promise<Producto[]> {
  const { rows } = await db.query<FilaProducto>(`SELECT ${COLUMNAS} FROM productos WHERE activo = TRUE ORDER BY orden, id`);
  return rows.map(normalizar);
}

export async function listarTodos(): Promise<Producto[]> {
  const { rows } = await db.query<FilaProducto>(`SELECT ${COLUMNAS}, activo FROM productos ORDER BY orden, id`);
  return rows.map(normalizar);
}

export async function crear(d: DatosProducto): Promise<Producto> {
  const { rows } = await db.query<FilaProducto>(
    `INSERT INTO productos
       (slug, nombre, categoria, descripcion, precio, precios_tamano,
        forma, formas, tamanos, lleva, nuevo, orden, activo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING ${COLUMNAS}, activo`,
    valores(d)
  );
  return normalizar(rows[0]!);
}

// `id` llega tal cual de la URL.
export async function actualizar(id: string, d: DatosProducto): Promise<Producto | null> {
  const { rows } = await db.query<FilaProducto>(
    `UPDATE productos
        SET slug=$1, nombre=$2, categoria=$3, descripcion=$4, precio=$5, precios_tamano=$6,
            forma=$7, formas=$8, tamanos=$9, lleva=$10, nuevo=$11, orden=$12, activo=$13
      WHERE id=$14
      RETURNING ${COLUMNAS}, activo`,
    [...valores(d), id]
  );
  return rows[0] ? normalizar(rows[0]) : null;
}

export async function desactivar(id: string): Promise<{ id: number } | null> {
  const { rows } = await db.query<{ id: number }>(`UPDATE productos SET activo = FALSE WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

// Lo que hace falta para armar un pedido.
export type ProductoParaPedido = Pick<
  FilaProducto,
  "id" | "slug" | "nombre" | "precio" | "precios_tamano" | "forma" | "formas" | "tamanos" | "lleva"
>;

// Las piezas activas pedidas, dentro de la transacción del pedido.
export async function buscarActivosPorSlug(slugs: string[], conexion: Conexion = db): Promise<ProductoParaPedido[]> {
  const { rows } = await conexion.query<ProductoParaPedido>(
    `SELECT id, slug, nombre, precio, precios_tamano, forma, formas, tamanos, lleva
       FROM productos
      WHERE slug = ANY($1::text[]) AND activo = TRUE`,
    [slugs]
  );
  return rows;
}
