// Datos que llegan a /api/productos (desde el panel).
import { z } from "zod";
import { FORMAS } from "../constantes/catalogo.js";

const formaId = z.enum(Object.keys(FORMAS));
const tamanoSchema = z.object({
  id: z.string().trim().min(1).max(30),
  nombre: z.string().trim().min(1).max(30),
  cm: z.coerce.number().positive().max(50),
});

export const productoSchema = z.object({
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
