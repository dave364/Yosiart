// Respuestas para lo que no salió bien.
import type { Request, Response, NextFunction } from "express";
import type { ZodError } from "zod";

export function rutaInexistente(_req: Request, res: Response) {
  res.status(404).json({ error: "Ruta no encontrada." });
}

// Manejador de errores unico. Nunca devuelve el stack al cliente:
// los detalles internos van al log del servidor y nada mas.
// Express lo reconoce como manejador de errores por tener 4 parámetros.
export function manejarErrores(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const e = err as { name?: string; type?: string; status?: number; message?: string } | null;
  if (e?.name === "ZodError") {
    return res.status(400).json({
      error: "Datos invalidos.",
      detalles: (err as ZodError).issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })),
    });
  }
  if (e?.type === "entity.too.large") {
    return res.status(413).json({ error: "El envio es demasiado pesado. Proba con fotos mas livianas." });
  }
  if (e?.status) {
    return res.status(e.status).json({ error: e.message });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
}
