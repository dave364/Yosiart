// Única puerta de la tienda hacia la API. Todas las llamadas pasan por
// acá, así el manejo de errores es el mismo en todas las páginas.
import { API_URL } from "../config";

export class ErrorApi extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

const SIN_CONEXION = "No pudimos conectarnos con el servidor. Probá de nuevo en un momento.";

// porDefecto: el mensaje si la API no explica qué pasó.
export async function pedirApi(ruta, { method = "GET", body, token, porDefecto = "Algo salio mal. Proba de nuevo." } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ErrorApi(SIN_CONEXION, 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Si la validación falló, el primer detalle dice exactamente qué campo revisar.
    throw new ErrorApi(data.detalles?.[0]?.mensaje || data.error || porDefecto, res.status);
  }
  return data;
}
