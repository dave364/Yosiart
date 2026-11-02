// Datos que llegan a /api/galeria (desde el panel).
import { z } from "zod";

export const fotoGaleriaSchema = z.object({
  foto: z.string().max(3_000_000),
  titulo: z.string().trim().max(80, "El título puede tener hasta 80 letras.").default(""),
});

export type DatosFotoGaleria = z.infer<typeof fotoGaleriaSchema>;
