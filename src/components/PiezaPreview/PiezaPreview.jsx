import { useId } from "react";
import { buscarColor, buscarGlitter } from "../../data/piezas";

// Vista previa aproximada de una pieza: forma + color + glitter + nombre
// (+ telefono o foto segun la pieza). Se usa en el personalizador y en
// las miniaturas del carrito.

const PUNTOS = {
  hueso: [[50, 45, 2.5], [80, 130, 2], [120, 70, 1.8], [170, 112, 2.2], [215, 64, 2], [250, 125, 2.6], [245, 40, 1.8], [140, 104, 1.5], [60, 100, 1.6]],
  corazon: [[70, 90, 2.5], [230, 100, 2], [100, 180, 2.2], [205, 175, 1.8], [150, 235, 2], [240, 140, 1.6], [60, 130, 1.8]],
  circulo: [[90, 80, 2.5], [210, 85, 2], [70, 170, 2.2], [230, 190, 1.8], [150, 250, 2], [120, 215, 1.6], [190, 230, 1.8]],
};

const Glitter = ({ forma, hex }) =>
  hex ? (
    <g fill={hex} opacity="0.9">
      {PUNTOS[forma].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} />
      ))}
    </g>
  ) : null;

const PiezaPreview = ({ forma, color, glitter, nombre, telefono, telefonoLado = "frente", foto, etiqueta, className }) => {
  const clipId = useId();
  const c = buscarColor(color);
  const g = buscarGlitter(glitter);
  const texto = (nombre || "").trim() || "Tu nombre";
  // La vista plana muestra solo el frente: si el teléfono va en el dorso, no se dibuja.
  const tel = telefonoLado === "frente" ? (telefono || "").trim() : "";
  const descripcion = etiqueta || `Vista previa: ${texto}, color ${c.nombre.toLowerCase()}`;

  if (forma === "corazon") {
    return (
      <svg viewBox="0 0 300 290" className={className} role="img" aria-label={descripcion}>
        <defs>
          <clipPath id={clipId}>
            <circle cx="150" cy="125" r="58" />
          </clipPath>
        </defs>
        <path
          d="M150 272 C 40 195 8 135 36 84 C 66 30 128 38 150 88 C 172 38 234 30 264 84 C 292 135 260 195 150 272 Z"
          fill={c.hex}
        />
        <Glitter forma="corazon" hex={g.hex} />
        <circle cx="150" cy="125" r="62" fill="#FFFFFF" opacity="0.9" />
        {foto ? (
          <image
            href={foto}
            x="92"
            y="67"
            width="116"
            height="116"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        ) : (
          <text x="150" y="130" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="700" fontSize="13" fill="#7A5468">
            Tu foto acá
          </text>
        )}
        <text x="150" y="222" textAnchor="middle" fontFamily="Dancing Script, cursive" fontWeight="700" fontSize="34" fill={c.texto}>
          {texto}
        </text>
      </svg>
    );
  }

  if (forma === "circulo") {
    return (
      <svg viewBox="0 0 300 300" className={className} role="img" aria-label={descripcion}>
        <circle cx="150" cy="150" r="128" fill={c.hex} />
        <Glitter forma="circulo" hex={g.hex} />
        <g fill={c.texto} opacity="0.9">
          <ellipse cx="112" cy="92" rx="10" ry="13" />
          <ellipse cx="136" cy="76" rx="10" ry="13" />
          <ellipse cx="164" cy="76" rx="10" ry="13" />
          <ellipse cx="188" cy="92" rx="10" ry="13" />
          <path d="M150 100c-15 0-30 17-30 31 0 9 8 13 16 10 5-1.5 9.5-3 14-3s9 1.5 14 3c8 3 16-1 16-10 0-14-15-31-30-31z" />
        </g>
        <text x="150" y="196" textAnchor="middle" fontFamily="Dancing Script, cursive" fontWeight="700" fontSize={texto.length > 8 ? 36 : 44} fill={c.texto}>
          {texto}
        </text>
        {tel && (
          <text x="150" y="226" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="700" fontSize="15" fill={c.texto}>
            {tel}
          </text>
        )}
      </svg>
    );
  }

  // hueso
  return (
    <svg viewBox="0 0 300 180" className={className} role="img" aria-label={descripcion}>
      <g fill={c.hex}>
        <rect x="60" y="58" width="180" height="64" rx="12" />
        <circle cx="62" cy="58" r="34" />
        <circle cx="62" cy="122" r="34" />
        <circle cx="238" cy="58" r="34" />
        <circle cx="238" cy="122" r="34" />
      </g>
      <Glitter forma="hueso" hex={g.hex} />
      <text
        x="150"
        y={tel ? 96 : 106}
        textAnchor="middle"
        fontFamily="Dancing Script, cursive"
        fontWeight="700"
        fontSize={texto.length > 8 ? 34 : 44}
        fill={c.texto}
      >
        {texto}
      </text>
      {tel && (
        <text x="150" y="116" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="700" fontSize="13" fill={c.texto}>
          {tel}
        </text>
      )}
    </svg>
  );
};

export default PiezaPreview;
