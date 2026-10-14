// Catalogo inicial de YosiArt.
// Mientras no exista la API, los productos viven aca. Cuando este lista,
// esto pasa a venir de GET /api/productos (igual que en Kenypets).
//
// precio: null => se muestra "Precio a confirmar". Completar con los
// precios reales en pesos.

export const COLORES = [
  { id: "frambuesa", nombre: "Frambuesa", hex: "#A8124C", texto: "#FFFFFF" },
  { id: "rosa", nombre: "Rosa chicle", hex: "#EC6FA3", texto: "#3A1A2A" },
  { id: "lila", nombre: "Lila", hex: "#8A4FC2", texto: "#FFFFFF" },
  { id: "turquesa", nombre: "Turquesa", hex: "#1F8FA3", texto: "#FFFFFF" },
  { id: "negro", nombre: "Negro", hex: "#2B1B24", texto: "#FFFFFF" },
];

export const GLITTERS = [
  { id: "sin", nombre: "Sin glitter", hex: null },
  { id: "dorado", nombre: "Dorado", hex: "#E2BE6E" },
  { id: "plateado", nombre: "Plateado", hex: "#F2F2F5" },
];

// forma: como se dibuja la vista previa (ver PiezaPreview).
// lleva: que datos pide el personalizador para esa pieza.
export const PIEZAS = [
  {
    id: "chapita-hueso",
    nombre: "Chapita hueso con nombre",
    descripcion: "Para el collar de tu perro, con glitter a elección.",
    categoria: "mascotas",
    forma: "hueso",
    // telefonoAtras: el cliente elige si el teléfono va adelante o en el dorso
    lleva: { nombre: true, telefono: true, telefonoAtras: true, foto: false },
    precio: null,
    nuevo: true,
    muestra: { color: "rosa", glitter: "dorado", nombre: "Luna", telefono: "" },
  },
  {
    id: "llavero-corazon-foto",
    nombre: "Llavero corazón con foto",
    descripcion: "La foto de tu mascota o de quien quieras, dentro de la resina.",
    categoria: "llaveros",
    forma: "corazon",
    lleva: { nombre: true, telefono: false, foto: true },
    precio: null,
    nuevo: false,
    muestra: { color: "lila", glitter: "plateado", nombre: "Miel", telefono: "" },
  },
  {
    id: "llavero-huellita",
    nombre: "Llavero huellita",
    descripcion: "Fondo del color que elijas con huellita y nombre.",
    categoria: "llaveros",
    forma: "circulo",
    lleva: { nombre: true, telefono: true, foto: false },
    precio: null,
    nuevo: false,
    muestra: { color: "negro", glitter: "dorado", nombre: "Toby", telefono: "" },
  },
  {
    id: "posavasos",
    nombre: "Posavasos personalizado",
    descripcion: "Juego de 2, con el nombre o la inicial que quieras.",
    categoria: "deco",
    forma: "circulo",
    lleva: { nombre: true, telefono: false, foto: false },
    precio: null,
    nuevo: false,
    muestra: { color: "turquesa", glitter: "plateado", nombre: "Casa", telefono: "" },
  },
];

export const CATEGORIAS = [
  {
    id: "mascotas",
    nombre: "Mascotas",
    descripcion: "Chapitas con nombre y número de teléfono opcional para identificación.",
    color: "var(--frambuesa)",
    icono: "huella",
  },
  {
    id: "llaveros",
    nombre: "Llaveros personalizados",
    descripcion: "Con nombres, iniciales, colores y glitter a elección.",
    color: "var(--lila-glitter)",
    icono: "llave",
  },
  {
    id: "deco",
    nombre: "Deco y hogar",
    descripcion: "Posavasos y portafotos personalizados.",
    color: "var(--turquesa)",
    icono: "posavasos",
  },
  {
    id: "souvenirs",
    nombre: "Souvenirs",
    descripcion: "Bodas, cumpleaños de 15, bautismos y fechas especiales.",
    color: "var(--dorado)",
    icono: "regalo",
  },
];

export const MAX_NOMBRE = 12;

export const buscarPieza = (id) => PIEZAS.find((p) => p.id === id) || null;
export const buscarColor = (id) => COLORES.find((c) => c.id === id) || COLORES[0];
export const buscarGlitter = (id) => GLITTERS.find((g) => g.id === id) || GLITTERS[0];

const formatoPesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const plata = (n) =>
  n == null ? "Precio a confirmar" : formatoPesos.format(n);
