// Respuestas para lo que no salió bien.

export function rutaInexistente(_req, res) {
  res.status(404).json({ error: "Ruta no encontrada." });
}

// Manejador de errores unico. Nunca devuelve el stack al cliente:
// los detalles internos van al log del servidor y nada mas.
// Express lo reconoce como manejador de errores por tener 4 parámetros.
export function manejarErrores(err, _req, res, _next) {
  if (err?.name === "ZodError") {
    return res.status(400).json({
      error: "Datos invalidos.",
      detalles: err.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })),
    });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "El envio es demasiado pesado. Proba con fotos mas livianas." });
  }
  if (err?.status) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
}
