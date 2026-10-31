import type { Personalizacion } from "../tipos.ts";

// Opciones fijas del taller: colores de resina, glitters y nombres de
// las formas. Tienen que coincidir con los ids del frontend
// (src/data/piezas.js y src/data/formas.jsx).

// Diccionarios id → nombre. Record<string, string> deja buscar con cualquier
// id (si no existe, da undefined y se ignora).
export const COLORES: Record<string, string> = {
  frambuesa: "Frambuesa",
  rosa: "Rosa chicle",
  lila: "Lila",
  turquesa: "Turquesa",
  negro: "Negro",
};

export const GLITTERS: Record<string, string> = {
  sin: "Sin glitter",
  dorado: "Glitter dorado",
  plateado: "Glitter plateado",
};

// Color de las letras (nombre y teléfono).
export const LETRAS: Record<string, string> = {
  plateado: "Letra plateada",
  negro: "Letra negra",
};

export const FORMAS: Record<string, string> = {
  hueso: "Hueso",
  circulo: "Círculo",
  pescado: "Pescadito",
  gato: "Gatito",
  huellita: "Huellita",
  corazon: "Corazón",
  posavasos: "Posavasos",
};

export const MAX_NOMBRE = 12;

// Una linea legible con la personalizacion, para los correos y el panel:
// "Hueso grande · Frambuesa · Glitter dorado · «Luna» · Letra plateada · Tel. 11 1234-5678 (dorso)"
export function describirPersonalizacion(p: Partial<Personalizacion> = {}): string {
  const partes: string[] = [];
  const forma = de(FORMAS, p.forma);
  if (forma) partes.push(p.tamanoNombre ? `${forma} ${p.tamanoNombre.toLowerCase()}` : forma);
  const color = de(COLORES, p.color);
  if (color) partes.push(color);
  const glitter = de(GLITTERS, p.glitter);
  if (glitter && p.glitter !== "sin") partes.push(glitter);
  if (p.nombre) partes.push(`«${p.nombre}»`);
  const letra = de(LETRAS, p.letra);
  if (letra && (p.nombre || p.telefono)) partes.push(letra);
  if (p.telefono) partes.push(`Tel. ${p.telefono}${p.telefonoLado === "dorso" ? " (dorso)" : ""}`);
  if (p.foto) partes.push("con foto");
  return partes.join(" · ");
}

// Nombre de un id en un diccionario (undefined si no hay id o no existe).
export const de = (dic: Record<string, string>, id: string | null | undefined) => (id ? dic[id] : undefined);

// Los ids de un diccionario, en el formato que pide z.enum.
export const ids = (dic: Record<string, string>) => Object.keys(dic) as [string, ...string[]];

export const ESTADOS_PEDIDO: Record<string, string> = {
  pendiente: "Recibido",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  listo: "Listo",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
