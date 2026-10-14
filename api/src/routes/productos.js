import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { requiereAdmin } from "../middleware/auth.js";
import { FORMAS } from "../catalogo.js";

export const router = Router();

const formaId = z.enum(Object.keys(FORMAS));
const tamanoSchema = z.object({
  id: z.string().trim().min(1).max(30),
  nombre: z.string().trim().min(1).max(30),
  cm: z.coerce.number().positive().max(50),
});

const productoSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/, "Solo letras, numeros y guiones"),
  nombre: z.string().trim().min(2).max(120),
  categoria: z.string().trim().min(2).max(60),
  descripcion: z.string().trim().max(500).default(""),
  // null = "precio a confirmar"
  precio: z.coerce.number().nonnegative().nullable().default(null),
  precios_tamano: z.record(z.string(), z.coerce.number().nonnegative()).default({}),
  forma: formaId,
  formas: z.array(formaId).default([]),
  tamanos: z.record(z.string(), z.array(tamanoSchema).min(1)).default({}),
  lleva: z
    .object({
      nombre: z.boolean().default(true),
      telefono: z.boolean().default(false),
      telefonoAtras: z.boolean().default(false),
      foto: z.boolean().default(false),
    })
    .default({ nombre: true }),
  nuevo: z.boolean().default(false),
  orden: z.coerce.number().int().default(0),
  activo: z.boolean().default(true),
});

const COLUMNAS = `id, slug, nombre, categoria, descripcion, precio, precios_tamano,
                  forma, formas, tamanos, lleva, nuevo, orden`;

// Numeric de Postgres llega como string; el front espera numeros.
export function normalizar(p) {
  return {
    ...p,
    precio: p.precio == null ? null : Number(p.precio),
  };
}

// Publico: solo productos activos.
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${COLUMNAS} FROM productos WHERE activo = TRUE ORDER BY orden, id`
    );
    res.json(rows.map(normalizar));
  } catch (err) {
    next(err);
  }
});

// Admin: incluye los desactivados.
router.get("/todos", requiereAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${COLUMNAS}, activo FROM productos ORDER BY orden, id`);
    res.json(rows.map(normalizar));
  } catch (err) {
    next(err);
  }
});

const valores = (d) => [
  d.slug, d.nombre, d.categoria, d.descripcion, d.precio,
  JSON.stringify(d.precios_tamano), d.forma, JSON.stringify(d.formas),
  JSON.stringify(d.tamanos), JSON.stringify(d.lleva), d.nuevo, d.orden, d.activo,
];

router.post("/", requiereAdmin, async (req, res, next) => {
  try {
    const d = productoSchema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO productos
         (slug, nombre, categoria, descripcion, precio, precios_tamano,
          forma, formas, tamanos, lleva, nuevo, orden, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING ${COLUMNAS}, activo`,
      valores(d)
    );
    res.status(201).json(normalizar(rows[0]));
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Ya hay un producto con ese slug." });
    next(err);
  }
});

router.put("/:id", requiereAdmin, async (req, res, next) => {
  try {
    const d = productoSchema.parse(req.body);
    const { rows } = await query(
      `UPDATE productos
          SET slug=$1, nombre=$2, categoria=$3, descripcion=$4, precio=$5, precios_tamano=$6,
              forma=$7, formas=$8, tamanos=$9, lleva=$10, nuevo=$11, orden=$12, activo=$13
        WHERE id=$14
        RETURNING ${COLUMNAS}, activo`,
      [...valores(d), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Producto no encontrado." });
    res.json(normalizar(rows[0]));
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Ya hay un producto con ese slug." });
    next(err);
  }
});

// Baja logica: nunca se borra de verdad, porque hay pedidos viejos
// que referencian este producto y perderian su historial.
router.delete("/:id", requiereAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE productos SET activo = FALSE WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Producto no encontrado." });
    res.json({ ok: true, mensaje: "Producto desactivado." });
  } catch (err) {
    next(err);
  }
});
