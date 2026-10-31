// Tipos compartidos de la tienda.

export interface Tamano {
  id: string;
  nombre: string;
  cm: number;
}

// Qué datos pide el personalizador para cada pieza.
export interface Lleva {
  nombre?: boolean;
  telefono?: boolean;
  // el cliente elige si el teléfono va adelante o en el dorso
  telefonoAtras?: boolean;
  foto?: boolean;
}

export type LadoTelefono = "frente" | "dorso";

// Cómo se ve una pieza: lo que eligió el cliente o la muestra del catálogo.
export interface Apariencia {
  forma?: string;
  color: string;
  glitter: string;
  nombre: string;
  letra?: string | null;
  telefono?: string | null;
  telefonoLado?: LadoTelefono | null;
  foto?: string | null;
  tamanoCm?: number | null;
}

// Lo que se guarda en el carrito y se manda en el pedido.
export interface Opciones extends Apariencia {
  forma: string;
  tamano: string | null;
}

export interface Pieza {
  id: string; // el slug: "chapita-mascota"
  dbId?: number; // el id de la base (solo si vino de la API)
  nombre: string;
  descripcion: string;
  categoria: string;
  forma: string; // forma por defecto
  formas?: string[]; // si existe, el cliente elige entre estas
  tamanos?: Record<string, Tamano[]>; // por forma
  lleva: Lleva;
  precio: number | null; // null = "Precio a confirmar"
  preciosTamano?: Record<string, number>; // { "chico": 3000, "hueso:grande": 4500 }
  nuevo: boolean;
  muestra: Apariencia;
}

export interface ItemCarrito {
  clave: string;
  piezaId: string;
  nombrePieza: string;
  forma: string;
  precio: number | null;
  opciones: Opciones;
  cantidad: number;
}

export type Rol = "cliente" | "admin";

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  rol: Rol;
}

// Cómo quedó cada pieza del pedido (lo que devuelve la API).
export interface PersonalizacionGuardada {
  forma?: string;
  tamano?: string | null;
  tamanoNombre?: string | null;
  tamanoCm?: number | null;
  color: string;
  glitter: string;
  nombre?: string;
  letra?: string | null;
  telefono?: string | null;
  telefonoLado?: LadoTelefono | null;
  foto?: string | null;
}

export interface ItemPedido {
  nombre: string;
  precio_unitario: number | null;
  cantidad: number;
  personalizacion: PersonalizacionGuardada;
}

export interface PasoHistorial {
  estado: string;
  nota: string | null;
  fecha: string;
}

export interface Pedido {
  id: number;
  numero: string;
  estado: string;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono?: string;
  usuario_id?: number | null; // solo en el panel
  total: number | null;
  creado_en: string;
  items: ItemPedido[];
  historial?: PasoHistorial[];
}

export interface Presupuesto {
  id: number;
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

export interface Cliente extends Usuario {
  activo: boolean;
  creado_en: string;
  pedidos: number;
  pendientes: number;
  gastado: number;
}

// Una pieza tal como la manda la API (GET /api/productos).
export interface ProductoApi {
  id: number;
  slug: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: number | null;
  precios_tamano: Record<string, number>;
  forma: string;
  formas: string[];
  tamanos: Record<string, Tamano[]>;
  lleva: Lleva;
  nuevo: boolean;
  orden: number;
  activo?: boolean;
}

// El mensaje de un error atrapado con try/catch.
export const mensajeDe = (err: unknown) => (err instanceof Error ? err.message : String(err));
