// Datos que llegan a /api/galeria (desde el panel).
import { z } from "zod";

const titulo = z.string().trim().max(80, "El título puede tener hasta 80 letras.");

export const fotoGaleriaSchema = z.object({
  foto: z.string().max(3_000_000),
  titulo: titulo.default(""),
});

export const tituloSchema = z.object({ titulo });

// Todas las fotos de la galería, en el orden nuevo.
export const ordenSchema = z.object({
  ids: z.array(z.number().int().positive()).max(500),
});

export type DatosFotoGaleria = z.infer<typeof fotoGaleriaSchema>;
