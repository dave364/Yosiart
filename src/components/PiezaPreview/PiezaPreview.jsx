import { useId } from "react";
import { buscarColor, buscarGlitter } from "../../data/piezas";
import { formaDe, tamanoNombre, HuellaDeco, FOTO_CORAZON, PUNTOS_GLITTER } from "../../data/formas";

// Vista plana (solo el frente) de una pieza. Se usa en las tarjetas del
// catálogo y en las miniaturas del carrito; el personalizador usa Pieza3D.

const PiezaPreview = ({ forma, color, glitter, nombre, telefono, telefonoLado = "frente", foto, etiqueta, className }) => {
  const id = useId().replace(/:/g, "");
  const f = formaDe(forma);
  const c = buscarColor(color);
  const g = buscarGlitter(glitter);
  const texto = (nombre || "").trim() || "Tu nombre";
  // Si el teléfono va en el dorso, acá no se dibuja.
  const tel = telefonoLado === "frente" ? (telefono || "").trim() : "";
  const fs = tamanoNombre(forma, texto);
  const cyNombre = f.texto.cy - (tel ? 10 : 0);
  const descripcion = etiqueta || `Vista previa: ${texto}, color ${c.nombre.toLowerCase()}`;

  return (
    <svg viewBox="0 0 300 300" className={className} role="img" aria-label={descripcion}>
      <defs>
        <clipPath id={`${id}-forma`}>{f.silueta}</clipPath>
        <clipPath id={`${id}-foto`}>
          <circle cx={FOTO_CORAZON.cx} cy={FOTO_CORAZON.cy} r={FOTO_CORAZON.r - 4} />
        </clipPath>
      </defs>
      <g fill={c.hex}>{f.silueta}</g>
      <g clipPath={`url(#${id}-forma)`}>
        {g.hex && (
          <g fill={g.hex} opacity="0.85">
            {PUNTOS_GLITTER.filter((_, i) => i % 3 === 0).map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={p[2]} />
            ))}
          </g>
        )}
        {forma === "huellita" && <HuellaDeco fill={c.texto} />}
        {forma === "corazon" && (
          <>
            <circle cx={FOTO_CORAZON.cx} cy={FOTO_CORAZON.cy} r={FOTO_CORAZON.r} fill="#FFFFFF" opacity="0.92" />
            {foto ? (
              <image
                href={foto}
                x={FOTO_CORAZON.cx - FOTO_CORAZON.r}
                y={FOTO_CORAZON.cy - FOTO_CORAZON.r}
                width={FOTO_CORAZON.r * 2}
                height={FOTO_CORAZON.r * 2}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${id}-foto)`}
              />
            ) : (
              <text x={FOTO_CORAZON.cx} y={FOTO_CORAZON.cy + 5} textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="700" fontSize="13" fill="#7A5468">
                Tu foto acá
              </text>
            )}
          </>
        )}
        <text
          x={f.texto.cx}
          y={cyNombre + fs * 0.33}
          textAnchor="middle"
          fontFamily="Dancing Script, cursive"
          fontWeight="700"
          fontSize={fs}
          fill={c.texto}
        >
          {texto}
        </text>
        {tel && (
          <text x={f.texto.cx} y={cyNombre + 30} textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="700" fontSize="14" fill={c.texto}>
            {tel}
          </text>
        )}
      </g>
      {f.agujero && <circle cx={f.agujero[0]} cy={f.agujero[1]} r="8" fill="#FFFFFF" opacity="0.85" />}
    </svg>
  );
};

export default PiezaPreview;
