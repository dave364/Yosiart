/* eslint-disable react-refresh/only-export-components -- es un archivo de datos, no de componentes */
// Formas de las piezas, dibujadas en un cuadro de 300×300.
// Las usan la vista 3D (Pieza3D) y la vista plana (PiezaPreview).
//
// Las chapitas copian el molde de silicona actual: círculo, hueso,
// pescadito y cabeza de gato, cada una con su pestaña
// y agujero para la argolla.
//
// Cada forma tiene:
//   silueta  el contorno (SVG) que se rellena con el color de la resina
//   agujero  [x, y] del agujero de la argolla, o null si no lleva
//   texto    { cx, cy, ancho, max }: centro y ancho disponible para el nombre
//   espesor  grosor de la resina en la vista 3D (unidades del cuadro)

export const FORMAS = {
  circulo: {
    nombre: "Círculo",
    silueta: (
      <>
        <circle cx="150" cy="162" r="112" />
        <circle cx="150" cy="50" r="24" />
      </>
    ),
    agujero: [150, 46],
    texto: { cx: 150, cy: 168, ancho: 186, max: 48 },
    espesor: 24,
  },
  hueso: {
    nombre: "Hueso",
    silueta: (
      <>
        <rect x="58" y="122" width="184" height="76" rx="14" />
        <circle cx="66" cy="122" r="40" />
        <circle cx="66" cy="198" r="40" />
        <circle cx="234" cy="122" r="40" />
        <circle cx="234" cy="198" r="40" />
        <circle cx="150" cy="112" r="24" />
      </>
    ),
    agujero: [150, 106],
    texto: { cx: 150, cy: 162, ancho: 176, max: 46 },
    espesor: 24,
  },
  pescado: {
    nombre: "Pescadito",
    silueta: (
      <>
        <ellipse cx="172" cy="166" rx="102" ry="64" />
        <path d="M86 166 C 66 146 46 122 22 114 C 36 142 36 190 22 218 C 46 210 66 186 86 166 Z" />
        <circle cx="186" cy="104" r="22" />
      </>
    ),
    agujero: [186, 100],
    texto: { cx: 180, cy: 172, ancho: 150, max: 44 },
    espesor: 24,
  },
  gato: {
    nombre: "Gatito",
    silueta: (
      <>
        <ellipse cx="150" cy="180" rx="114" ry="92" />
        <path d="M46 160 Q 40 84 66 38 Q 104 64 136 104 Z" />
        <path d="M254 160 Q 260 84 234 38 Q 196 64 164 104 Z" />
      </>
    ),
    agujero: [150, 108],
    texto: { cx: 150, cy: 194, ancho: 170, max: 46 },
    espesor: 24,
  },

  // Llaveros y deco
  huellita: {
    nombre: "Huellita",
    silueta: <circle cx="150" cy="160" r="122" />,
    agujero: [150, 54],
    texto: { cx: 150, cy: 210, ancho: 180, max: 44 },
    espesor: 24,
  },
  corazon: {
    nombre: "Corazón",
    silueta: <path d="M150 280 C 40 203 8 143 36 92 C 66 38 128 46 150 96 C 172 46 234 38 264 92 C 292 143 260 203 150 280 Z" />,
    agujero: [150, 106],
    texto: { cx: 150, cy: 236, ancho: 112, max: 32 },
    espesor: 24,
  },
  posavasos: {
    nombre: "Posavasos",
    silueta: <circle cx="150" cy="150" r="130" />,
    agujero: null,
    texto: { cx: 150, cy: 150, ancho: 210, max: 54 },
    espesor: 32,
  },
};

export const formaDe = (id) => FORMAS[id] || FORMAS.circulo;

// Huellita decorativa del llavero "huellita".
export const HuellaDeco = ({ fill }) => (
  <g fill={fill} opacity="0.9" transform="translate(0 12)">
    <ellipse cx="112" cy="92" rx="10" ry="13" />
    <ellipse cx="136" cy="76" rx="10" ry="13" />
    <ellipse cx="164" cy="76" rx="10" ry="13" />
    <ellipse cx="188" cy="92" rx="10" ry="13" />
    <path d="M150 100c-15 0-30 17-30 31 0 9 8 13 16 10 5-1.5 9.5-3 14-3s9 1.5 14 3c8 3 16-1 16-10 0-14-15-31-30-31z" />
  </g>
);

// Foto circular dentro del corazón.
export const FOTO_CORAZON = { cx: 150, cy: 166, r: 50 };

// Tamaño de letra para que el nombre entre en el ancho de la forma.
// Dancing Script ocupa ~0.5em por letra.
export const tamanoNombre = (forma, nombre) => {
  const { ancho, max } = formaDe(forma).texto;
  const letras = Math.max(3, nombre.length);
  return Math.min(max, Math.floor(ancho / (letras * 0.5)));
};

// Tamaño del teléfono cuando va solo en el dorso (Nunito ~0.6em por carácter).
export const tamanoTelefonoDorso = (forma, telefono) => {
  const { ancho } = formaDe(forma).texto;
  return Math.min(24, Math.floor(ancho / (Math.max(8, telefono.length) * 0.6)));
};

// Puntos de glitter fijos (semilla fija para que no cambien entre renders).
export const PUNTOS_GLITTER = (() => {
  let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 70 }, () => [30 + r() * 240, 40 + r() * 240, 0.8 + r() * 2.2, r() * Math.PI * 2]);
})();
