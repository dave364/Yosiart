// Error con código HTTP. El manejador de errores (middleware/errores.js)
// responde con este código y este mensaje tal cual.
export class ErrorHttp extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

export const datoInvalido = (mensaje) => new ErrorHttp(400, mensaje);
export const noEncontrado = (mensaje) => new ErrorHttp(404, mensaje);
export const prohibido = (mensaje) => new ErrorHttp(403, mensaje);
export const conflicto = (mensaje) => new ErrorHttp(409, mensaje);

// Código de Postgres cuando se repite un valor UNIQUE (email, slug).
export const esDuplicado = (err) => err?.code === "23505";
