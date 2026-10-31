import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { Apariencia } from "../../tipos";
import { buscarColor, buscarGlitter } from "../../data/piezas";
import {
  formaDe,
  tamanoNombre,
  tamanoTelefonoDorso,
  HuellaDeco,
  DegradeLetra,
  pinturaLetra,
  FOTO_CORAZON,
  PUNTOS_GLITTER as PUNTOS,
} from "../../data/formas";
import "./Pieza3D.scss";

// Vista 3D de la pieza: se arma con láminas SVG apiladas en CSS 3D
// (sin librerías). El giro, el brillo y los destellos del glitter se
// actualizan por fuera de React en cada cuadro, para que vaya fluido.
// Las formas vienen de data/formas.tsx (las mismas que la vista plana).

const CAPAS = 26; // láminas que forman el espesor
const ANCHO_BASE = 62; // % del escenario que ocupa la pieza más grande (6 cm)

// Oscurece (k < 0) o aclara (k > 0) un color hex.
const mezclar = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  return (
    "#" +
    [n >> 16, (n >> 8) & 255, n & 255]
      .map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
};

const Argolla = ({ cy, r }: { cy: number; r: number }) => (
  <>
    <circle cx="150" cy={cy} r={r} fill="none" stroke="#B8892E" strokeWidth="7" />
    <circle cx="150" cy={cy} r={r} fill="none" stroke="#F1D27A" strokeWidth="2.5" strokeDasharray="40 30" />
  </>
);

// compacta: versión para las tarjetas del catálogo. Gira sola, se puede
// arrastrar de costado, y no muestra botones ni la pista de "Arrastrá".
interface Props extends Partial<Apariencia> {
  compacta?: boolean;
  giroInicial?: number;
  etiqueta?: string;
}

const Pieza3D = ({
  forma = "hueso",
  color,
  glitter,
  nombre,
  letra,
  telefono,
  telefonoLado = "dorso",
  foto,
  tamanoCm,
  compacta = false,
  giroInicial = -25,
  etiqueta,
}: Props) => {
  const id = useId().replace(/:/g, "");
  const escenarioRef = useRef<HTMLDivElement>(null);
  const piezaRef = useRef<HTMLDivElement>(null);
  const sombraRef = useRef<HTMLDivElement>(null);
  // Estado del giro. Vive en un ref (no en useState) porque cambia en cada
  // cuadro de la animación y no hace falta volver a dibujar React por eso.
  const giro = useRef({
    rotY: giroInicial,
    rotX: -8,
    vel: 0,
    arrastrando: false,
    x: 0,
    y: 0,
    objetivo: null as number | null, // ángulo al que tiene que llegar (frente o dorso)
  });
  const reducir =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [auto, setAuto] = useState(!reducir);
  const autoRef = useRef(auto);
  const [ancho, setAncho] = useState(0);
  const [tocado, setTocado] = useState(false);
  // Fuera de pantalla no se anima: en el catálogo hay varias piezas a la vez.
  const visible = useRef(true);

  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);

  // El espesor se calcula en px, así que necesitamos el ancho real de la pieza.
  useEffect(() => {
    const el = piezaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAncho(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = escenarioRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Dibuja la pose actual: giro, brillo, destellos y sombra.
  const pintar = () => {
    const g = giro.current;
    const pieza = piezaRef.current;
    if (!pieza) return;
    pieza.style.transform = `translate(-50%, -50%) rotateX(${g.rotX}deg) rotateY(${g.rotY}deg)`;
    const rad = (g.rotY * Math.PI) / 180;
    pieza.querySelector("[data-banda]")?.setAttribute("transform", `translate(${Math.sin(rad) * 260} 0)`);
    pieza.querySelectorAll<SVGCircleElement>("[data-destello]").forEach((el) => {
      const fase = PUNTOS[Number(el.dataset.destello)]![3];
      const luz = Math.pow(Math.max(0, Math.cos(rad * 3 + fase)), 6);
      el.setAttribute("opacity", (0.35 + luz * 0.65).toFixed(2));
    });
    if (sombraRef.current) sombraRef.current.style.width = `${18 + 28 * Math.abs(Math.cos(rad))}%`;
  };

  // Bucle de animación: inercia al soltar, giro automático y vuelta suave de la inclinación.
  useEffect(() => {
    let raf = 0;
    let prev = 0;
    const cuadro = (t: number) => {
      const dt = Math.min(50, t - (prev || t));
      prev = t;
      const g = giro.current;
      if (!g.arrastrando && visible.current) {
        if (g.objetivo != null) {
          // Gira suave hasta mostrar la cara pedida (por ejemplo, el dorso con el teléfono).
          g.rotY += (g.objetivo - g.rotY) * Math.min(1, dt / 120);
          if (Math.abs(g.objetivo - g.rotY) < 0.5) {
            g.rotY = g.objetivo;
            g.objetivo = null;
          }
        } else if (Math.abs(g.vel) > 0.01) {
          g.rotY += g.vel * dt;
          g.vel *= Math.pow(0.9, dt / 16);
        } else if (compacta && autoRef.current) {
          // En el catálogo se balancea mostrando el frente, para que siempre
          // se lea el nombre. Si la dieron vuelta, vuelve sola al frente.
          const frente = Math.round(g.rotY / 360) * 360;
          const meta = frente + 32 * Math.sin(t / 1300 + giroInicial);
          g.rotY += (meta - g.rotY) * Math.min(1, dt / 400);
        } else if (autoRef.current) {
          g.rotY += 0.025 * dt;
        }
        g.rotX += (-8 - g.rotX) * 0.05;
        pintar();
      }
      raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Repinta enseguida cuando cambian las opciones (nuevas láminas, nuevos destellos).
  useEffect(pintar);

  const alApretar = (e: PointerEvent<HTMLDivElement>) => {
    const g = giro.current;
    g.arrastrando = true;
    g.vel = 0;
    g.objetivo = null;
    g.x = e.clientX;
    g.y = e.clientY;
    escenarioRef.current?.setPointerCapture(e.pointerId);
    setTocado(true);
  };
  const alMover = (e: PointerEvent<HTMLDivElement>) => {
    const g = giro.current;
    if (!g.arrastrando) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    g.x = e.clientX;
    g.y = e.clientY;
    g.rotY += dx * 0.6;
    g.rotX = Math.max(-35, Math.min(25, g.rotX - dy * 0.3));
    g.vel = Math.max(-0.35, Math.min(0.35, (dx * 0.6) / 16));
    pintar();
  };
  const alSoltar = () => {
    giro.current.arrastrando = false;
  };
  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    giro.current.vel = 0;
    giro.current.rotY += e.key === "ArrowLeft" ? -15 : 15;
    pintar();
  };
  // Lleva la pieza a mostrar el frente (0°) o el dorso (180°) por el camino más corto.
  const mostrarCara = (cara: "frente" | "dorso") => {
    setAuto(false);
    const g = giro.current;
    g.vel = 0;
    const base = cara === "dorso" ? 180 : 0;
    g.objetivo = Math.round((g.rotY - base) / 360) * 360 + base;
  };

  // Al escribir el teléfono o cambiar de lado, mostramos la cara donde va a quedar.
  const telLimpio = (telefono || "").trim();
  useEffect(() => {
    if (forma === "corazon" || !telLimpio) return;
    mostrarCara(telefonoLado === "dorso" ? "dorso" : "frente");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telLimpio, telefonoLado]);

  const f = formaDe(forma);
  const c = buscarColor(color);
  const gl = buscarGlitter(glitter);
  const { silueta, agujero: hueco, texto: caja } = f;
  const [ax, ay] = hueco || [150, 150];
  const texto = (nombre || "").trim() || "Tu nombre";
  const tel = forma !== "corazon" ? telLimpio : "";
  const telFrente = telefonoLado === "frente" ? tel : "";
  const telDorso = telefonoLado === "dorso" ? tel : "";
  const escala = ancho / 300;
  const zFrente = (f.espesor / 2) * escala;
  const colorHueco = mezclar(c.hex, -0.5);
  const pintura = pinturaLetra(letra, `${id}-letra`, c.texto);
  const pinturaDorso = pinturaLetra(letra, `${id}-letra-dorso`, c.texto);
  const fs = tamanoNombre(forma, texto);
  const cyNombre = caja.cy - (telFrente ? 10 : 0);
  // La pieza se ve más chica o más grande según su medida real.
  const anchoPieza = tamanoCm ? ANCHO_BASE * Math.max(0.62, Math.min(1, tamanoCm / 6)) : ANCHO_BASE;

  return (
    <div className={`pieza3d${compacta ? " pieza3d--compacta" : ""}`}>
      <div
        ref={escenarioRef}
        className="pieza3d__escenario"
        tabIndex={compacta ? undefined : 0}
        role="img"
        aria-roledescription="vista 3D"
        aria-label={
          compacta
            ? etiqueta || `${f.nombre} con ${texto}, color ${c.nombre.toLowerCase()}`
            : `Vista 3D: ${f.nombre.toLowerCase()} con ${texto}, color ${c.nombre.toLowerCase()}. Usá las flechas izquierda y derecha para girarla.`
        }
        onPointerDown={alApretar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onKeyDown={alTeclear}
      >
        <div ref={sombraRef} className="pieza3d__sombra" />
        <div ref={piezaRef} className="pieza3d__pieza" style={{ width: `${anchoPieza}%` }}>
          {ancho > 0 && (
            <>
              {/* Canto: láminas intermedias, más oscuras hacia el centro */}
              {Array.from({ length: CAPAS - 2 }, (_, j) => {
                const t = (j + 1) / (CAPAS - 1) - 0.5;
                return (
                  <svg
                    key={j}
                    className="pieza3d__capa"
                    viewBox="0 0 300 300"
                    style={{ transform: `translateZ(${t * f.espesor * escala}px)` }}
                    aria-hidden="true"
                  >
                    <g fill={mezclar(c.hex, -0.28 + Math.abs(t) * 0.3)}>{silueta}</g>
                    {hueco && <circle cx={ax} cy={ay} r="8" fill={colorHueco} />}
                  </svg>
                );
              })}

              {/* Frente */}
              <svg
                className="pieza3d__capa pieza3d__capa--cara"
                viewBox="0 0 300 300"
                style={{ transform: `translateZ(${zFrente}px)` }}
                aria-hidden="true"
              >
                <defs>
                  <clipPath id={`${id}-forma`}>{silueta}</clipPath>
                  <clipPath id={`${id}-foto`}>
                    <circle cx={FOTO_CORAZON.cx} cy={FOTO_CORAZON.cy} r={FOTO_CORAZON.r - 4} />
                  </clipPath>
                  <linearGradient id={`${id}-brillo`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="300" y2="300">
                    <stop offset="0" stopColor="#fff" stopOpacity="0" />
                    <stop offset=".42" stopColor="#fff" stopOpacity="0" />
                    <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
                    <stop offset=".58" stopColor="#fff" stopOpacity="0" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                  </linearGradient>
                  <DegradeLetra id={`${id}-letra`} />
                </defs>
                <g fill={c.hex}>{silueta}</g>
                <g clipPath={`url(#${id}-forma)`}>
                  {gl.hex &&
                    PUNTOS.map((p, i) => (
                      <circle key={i} data-destello={i} cx={p[0]} cy={p[1]} r={p[2]} fill={gl.hex ?? undefined} />
                    ))}
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
                    x={caja.cx}
                    y={cyNombre + fs * 0.33}
                    textAnchor="middle"
                    fontFamily="Dancing Script, cursive"
                    fontWeight="700"
                    fontSize={fs}
                    {...pintura}
                  >
                    {texto}
                  </text>
                  {telFrente && (
                    <text x={caja.cx} y={cyNombre + 30} textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="700" fontSize="14" {...pintura}>
                      {telFrente}
                    </text>
                  )}
                  <rect data-banda="" x="-300" y="-300" width="900" height="900" fill={`url(#${id}-brillo)`} />
                </g>
                {hueco && <circle cx={ax} cy={ay} r="8" fill={colorHueco} />}
              </svg>

              {/* Dorso: liso, o con el teléfono si el cliente lo eligió atrás.
                  La forma va espejada para que coincida con el frente al dar vuelta la pieza
                  (importa en las formas asimétricas, como el pescadito). */}
              <svg
                className="pieza3d__capa pieza3d__capa--cara"
                viewBox="0 0 300 300"
                style={{ transform: `translateZ(${-zFrente}px) rotateY(180deg)` }}
                aria-hidden="true"
              >
                <defs>
                  <DegradeLetra id={`${id}-letra-dorso`} />
                </defs>
                <g transform="translate(300 0) scale(-1 1)">
                  <g fill={mezclar(c.hex, -0.08)}>{silueta}</g>
                  {hueco && <circle cx={ax} cy={ay} r="8" fill={colorHueco} />}
                </g>
                {telDorso && (
                  <text
                    x={300 - caja.cx}
                    y={caja.cy + 8}
                    textAnchor="middle"
                    fontFamily="Nunito, sans-serif"
                    fontWeight="800"
                    fontSize={tamanoTelefonoDorso(forma, telDorso)}
                    {...pinturaDorso}
                  >
                    {telDorso}
                  </text>
                )}
              </svg>

              {/* Argolla dorada, perpendicular a la pieza */}
              {hueco && (
                <svg
                  className="pieza3d__capa"
                  viewBox="0 0 300 300"
                  style={{ transform: `translateX(${(ax - 150) * escala}px) rotateY(90deg)` }}
                  aria-hidden="true"
                >
                  <Argolla cy={ay - 32} r={32} />
                </svg>
              )}
            </>
          )}
        </div>
        {!tocado && !compacta && <p className="pieza3d__pista">Arrastrá para girar</p>}
      </div>

      {!compacta && (
        <div className="pieza3d__controles">
          <button type="button" className="chip" aria-pressed={auto} onClick={() => setAuto((v) => !v)}>
            Giro automático
          </button>
          <button type="button" className="chip" onClick={() => mostrarCara("frente")}>
            Ver frente
          </button>
          <button type="button" className="chip" onClick={() => mostrarCara("dorso")}>
            Ver dorso
          </button>
        </div>
      )}
    </div>
  );
};

export default Pieza3D;
