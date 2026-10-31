// Error con código HTTP. El manejador de errores (middleware/errores.js)
// responde con este código y este mensaje tal cual.
export class ErrorHttp extends Error {
  status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.status = status;
  }
}

export const datoInvalido = (mensaje: string) => new ErrorHttp(400, mensaje);
export const noEncontrado = (mensaje: string) => new ErrorHttp(404, mensaje);
export const prohibido = (mensaje: string) => new ErrorHttp(403, mensaje);
export const conflicto = (mensaje: string) => new ErrorHttp(409, mensaje);

// Código de Postgres cuando se repite un valor UNIQUE (email, slug).
export const esDuplicado = (err: unknown) => (err as { code?: string } | null)?.code === "23505";
