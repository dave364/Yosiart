// Datos que llegan a /api/usuarios (panel).
import { z } from "zod";

export const idSchema = z.coerce.number().int().positive();
export const activoSchema = z.object({ activo: z.boolean() });
