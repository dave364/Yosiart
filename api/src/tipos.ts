// Tipos que comparten las capas de la API: lo que hay en la base y lo
// que viaja en la sesión. Los datos que llegan del cliente se tipan
// desde los schemas de Zod (z.infer), así no se escriben dos veces.
import type { QueryResult, QueryResultRow } from "pg";

export type Rol = "cliente" | "admin";

// Lo que va dentro del token de sesión.
export interface UsuarioToken {
  id: number;
  email: string;
  rol: Rol;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  rol: Rol;
}

export interface UsuarioConClave extends Usuario {
  password_hash: string;
  activo: boolean;
}

export interface Tamano {
  id: string;
  nombre: string;
  cm: number;
}

export interface Lleva {
  nombre?: boolean;
  telefono?: boolean;
  telefonoAtras?: boolean;
  foto?: boolean;
}

export interface Producto {
  id: number;
  slug: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: number | null;
  // "hueso:grande" o "grande" → precio
  precios_tamano: Record<string, number>;
  forma: string;
  formas: string[];
  tamanos: Record<string, Tamano[]>;
  lleva: Lleva;
  nuevo: boolean;
  orden: number;
  activo?: boolean;
}

// Cómo quedó cada pieza del pedido, ya validada por el servidor.
export interface Personalizacion {
  forma: string;
  tamano: string | null;
  tamanoNombre: string | null;
  tamanoCm: number | null;
  color: string;
  glitter: string;
  nombre: string;
  letra: string | null;
  telefono: string | null;
  telefonoLado: "frente" | "dorso" | null;
  foto: string | null;
}

export interface PedidoItem {
  nombre: string;
  precio_unitario: number | null;
  cantidad: number;
  personalizacion: Personalizacion;
}

export interface Pedido {
  id: number;
  numero: string;
  estado: string;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono?: string;
  total: number | null;
  creado_en?: string;
  items?: PedidoItem[];
}

export interface Presupuesto {
  id: number;
  usuario_id: number | null;
  nombre: string;
  email: string;
  telefono: string | null;
  tipo: string;
  cantidad: number | null;
  fecha_evento: string | null;
  descripcion: string;
  fotos: string[];
  estado: string;
  respuesta: string | null;
  precio: number | null;
  creado_en: string;
}

// Algo que puede hacer consultas: la conexión general o la de una transacción.
export interface Conexion {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

// req.usuario lo completan los middlewares de sesión (middleware/auth.ts).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioToken | null;
    }
  }
}
