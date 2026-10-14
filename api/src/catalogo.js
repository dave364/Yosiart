// Opciones fijas del taller: colores de resina, glitters y nombres de
// las formas. Tienen que coincidir con los ids del frontend
// (src/data/piezas.js y src/data/formas.jsx).

export const COLORES = {
  frambuesa: "Frambuesa",
  rosa: "Rosa chicle",
  lila: "Lila",
  turquesa: "Turquesa",
  negro: "Negro",
};

export const GLITTERS = {
  sin: "Sin glitter",
  dorado: "Glitter dorado",
  plateado: "Glitter plateado",
};

export const FORMAS = {
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
// "Hueso grande · Frambuesa · Glitter dorado · «Luna» · Tel. 11 1234-5678 (dorso)"
export function describirPersonalizacion(p = {}) {
  const partes = [];
  const forma = FORMAS[p.forma];
  if (forma) partes.push(p.tamanoNombre ? `${forma} ${p.tamanoNombre.toLowerCase()}` : forma);
  if (COLORES[p.color]) partes.push(COLORES[p.color]);
  if (GLITTERS[p.glitter] && p.glitter !== "sin") partes.push(GLITTERS[p.glitter]);
  if (p.nombre) partes.push(`«${p.nombre}»`);
  if (p.telefono) partes.push(`Tel. ${p.telefono}${p.telefonoLado === "dorso" ? " (dorso)" : ""}`);
  if (p.foto) partes.push("con foto");
  return partes.join(" · ");
}

export const ESTADOS_PEDIDO = {
  pendiente: "Recibido",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  listo: "Listo",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
