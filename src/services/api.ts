// Única puerta de la tienda hacia la API. Todas las llamadas pasan por
// acá, así el manejo de errores es el mismo en todas las páginas.
import { API_URL } from "../config";

export class ErrorApi extends Error {
  status: number;

  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.status = status;
  }
}

const SIN_CONEXION = "No pudimos conectarnos con el servidor. Probá de nuevo en un momento.";

export interface OpcionesPedido {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  // El mensaje si la API no explica qué pasó.
  porDefecto?: string;
}

// <T>: el tipo de lo que responde la API en esa ruta.
export async function pedirApi<T>(
  ruta: string,
  { method = "GET", body, token, porDefecto = "Algo salio mal. Proba de nuevo." }: OpcionesPedido = {}
): Promise<T> {
  let res: Response;
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
  return data as T;
}
