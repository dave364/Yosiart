import { useEffect, useId, useRef, useState } from "react";
import { buscarColor, buscarGlitter } from "../../data/piezas";
import "./Pieza3D.scss";

// Vista 3D de la pieza: se arma con láminas SVG apiladas en CSS 3D
// (sin librerías). El giro, el brillo y los destellos del glitter se
// actualizan por fuera de React en cada cuadro, para que vaya fluido.

// Siluetas en un cuadro de 300×300 (las mismas formas que PiezaPreview).
const SILUETA = {
  hueso: (
    <>
      <rect x="60" y="118" width="180" height="64" rx="12" />
      <circle cx="62" cy="118" r="34" />
      <circle cx="62" cy="182" r="34" />
      <circle cx="238" cy="118" r="34" />
      <circle cx="238" cy="182" r="34" />
    </>
  ),
  corazon: <path d="M150 280 C 40 203 8 143 36 92 C 66 38 128 46 150 96 C 172 46 234 38 264 92 C 292 143 260 203 150 280 Z" />,
  circulo: <circle cx="150" cy="160" r="122" />,
};
const ARGOLLA = { hueso: [62, 92], corazon: [150, 104], circulo: [150, 54] };
const NOMBRE_Y = { hueso: 165, corazon: 222, circulo: 228 };

const CAPAS = 26; // láminas que forman el espesor
const ESPESOR = 26; // en unidades del cuadro de 300

// Puntos de glitter fijos (semilla fija para que no cambien entre renders).
const PUNTOS = (() => {
  let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 70 }, () => [30 + r() * 240, 40 + r() * 240, 0.8 + r() * 2.2, r() * Math.PI * 2]);
})();

// Oscurece (k < 0) o aclara (k > 0) un color hex.
const mezclar = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  return (
    "#" +
    [n >> 16, (n >> 8) & 255, n & 255]
      .map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
};

const Argolla = ({ cy, r }) => (
  <>
    <circle cx="150" cy={cy} r={r} fill="none" stroke="#B8892E" strokeWidth="7" />
    <circle cx="150" cy={cy} r={r} fill="none" stroke="#F1D27A" strokeWidth="2.5" strokeDasharray="40 30" />
  </>
);

const Pieza3D = ({ forma = "hueso", color, glitter, nombre, telefono, telefonoLado = "dorso", foto }) => {
  const id = useId().replace(/:/g, "");
  const escenarioRef = useRef(null);
  const piezaRef = useRef(null);
  const sombraRef = useRef(null);
  const giro = useRef({ rotY: -25, rotX: -8, vel: 0, arrastrando: false, x: 0, y: 0, objetivo: null });
  const reducir =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [auto, setAuto] = useState(!reducir);
  const autoRef = useRef(auto);
  const [ancho, setAncho] = useState(0);
  const [tocado, setTocado] = useState(false);

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

  // Dibuja la pose actual: giro, brillo, destellos y sombra.
  const pintar = () => {
    const g = giro.current;
    const pieza = piezaRef.current;
    if (!pieza) return;
    pieza.style.transform = `translate(-50%, -50%) rotateX(${g.rotX}deg) rotateY(${g.rotY}deg)`;
    const rad = (g.rotY * Math.PI) / 180;
    pieza.querySelector("[data-banda]")?.setAttribute("transform", `translate(${Math.sin(rad) * 260} 0)`);
    pieza.querySelectorAll("[data-destello]").forEach((el) => {
      const fase = PUNTOS[el.dataset.destello][3];
      const luz = Math.pow(Math.max(0, Math.cos(rad * 3 + fase)), 6);
      el.setAttribute("opacity", (0.35 + luz * 0.65).toFixed(2));
    });
    if (sombraRef.current) sombraRef.current.style.width = `${18 + 28 * Math.abs(Math.cos(rad))}%`;
  };

  // Bucle de animación: inercia al soltar, giro automático y vuelta suave de la inclinación.
  useEffect(() => {
    let raf;
    let prev = 0;
    const cuadro = (t) => {
      const dt = Math.min(50, t - (prev || t));
      prev = t;
      const g = giro.current;
      if (!g.arrastrando) {
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
  }, []);

  // Repinta enseguida cuando cambian las opciones (nuevas láminas, nuevos destellos).
  useEffect(pintar);

  const alApretar = (e) => {
    const g = giro.current;
    g.arrastrando = true;
    g.vel = 0;
    g.objetivo = null;
    g.x = e.clientX;
    g.y = e.clientY;
    escenarioRef.current?.setPointerCapture(e.pointerId);
    setTocado(true);
  };
  const alMover = (e) => {
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
  const alTeclear = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    giro.current.vel = 0;
    giro.current.rotY += e.key === "ArrowLeft" ? -15 : 15;
    pintar();
  };
  // Lleva la pieza a mostrar el frente (0°) o el dorso (180°) por el camino más corto.
  const mostrarCara = (cara) => {
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

  const c = buscarColor(color);
  const gl = buscarGlitter(glitter);
  const silueta = SILUETA[forma] || SILUETA.hueso;
  const [ax, ay] = ARGOLLA[forma] || ARGOLLA.hueso;
  const texto = (nombre || "").trim() || "Tu nombre";
  const tel = forma !== "corazon" ? telLimpio : "";
  const telFrente = telefonoLado === "frente" ? tel : "";
  const telDorso = telefonoLado === "dorso" ? tel : "";
  const escala = ancho / 300;
  const zFrente = (ESPESOR / 2) * escala;
  const agujero = mezclar(c.hex, -0.5);
  const yNombre = NOMBRE_Y[forma] - (telFrente ? 10 : 0);
  const yDorso = NOMBRE_Y[forma] - (forma === "hueso" ? 18 : 14);

  return (
    <div className="pieza3d">
      <div
        ref={escenarioRef}
        className="pieza3d__escenario"
        tabIndex={0}
        role="img"
        aria-roledescription="vista 3D"
        aria-label={`Vista 3D: ${texto}, color ${c.nombre.toLowerCase()}. Usá las flechas izquierda y derecha para girarla.`}
        onPointerDown={alApretar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onKeyDown={alTeclear}
      >
        <div ref={sombraRef} className="pieza3d__sombra" />
        <div ref={piezaRef} className="pieza3d__pieza">
          {ancho > 0 && (
            <>
              {/* Canto: láminas intermedias, más oscuras hacia el centro */}
              {Array.from({ length: CAPAS - 2 }, (_, j) => {
                const i = j + 1;
                const t = i / (CAPAS - 1) - 0.5;
                return (
                  <svg
                    key={i}
                    className="pieza3d__capa"
                    viewBox="0 0 300 300"
                    style={{ transform: `translateZ(${t * ESPESOR * escala}px)` }}
                    aria-hidden="true"
                  >
                    <g fill={mezclar(c.hex, -0.28 + Math.abs(t) * 0.3)}>{silueta}</g>
                    <circle cx={ax} cy={ay} r="9" fill={agujero} />
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
                    <circle cx="150" cy="150" r="54" />
                  </clipPath>
                  <linearGradient id={`${id}-brillo`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="300" y2="300">
                    <stop offset="0" stopColor="#fff" stopOpacity="0" />
                    <stop offset=".42" stopColor="#fff" stopOpacity="0" />
                    <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
                    <stop offset=".58" stopColor="#fff" stopOpacity="0" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <g fill={c.hex}>{silueta}</g>
                <g clipPath={`url(#${id}-forma)`}>
                  {gl.hex &&
                    PUNTOS.map((p, i) => (
                      <circle key={i} data-destello={i} cx={p[0]} cy={p[1]} r={p[2]} fill={gl.hex} />
                    ))}
                  {forma === "corazon" && (
                    <>
                      <circle cx="150" cy="150" r="58" fill="#FFFFFF" opacity="0.92" />
                      {foto ? (
                        <image
                          href={foto}
                          x="96"
                          y="96"
                          width="108"
                          height="108"
                          preserveAspectRatio="xMidYMid slice"
                          clipPath={`url(#${id}-foto)`}
                        />
                      ) : (
                        <text x="150" y="155" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="700" fontSize="13" fill="#7A5468">
                          Tu foto acá
                        </text>
                      )}
                    </>
                  )}
                  <text
                    x="150"
                    y={yNombre}
                    textAnchor="middle"
                    fontFamily="Dancing Script, cursive"
                    fontWeight="700"
                    fontSize={forma === "corazon" ? 34 : texto.length > 8 ? 36 : 46}
                    fill={c.texto}
                  >
                    {texto}
                  </text>
                  {telFrente && (
                    <text x="150" y={yNombre + 24} textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="700" fontSize="14" fill={c.texto}>
                      {telFrente}
                    </text>
                  )}
                  <rect data-banda="" x="-300" y="-300" width="900" height="900" fill={`url(#${id}-brillo)`} />
                </g>
                <circle cx={ax} cy={ay} r="9" fill={agujero} />
              </svg>

              {/* Dorso: el teléfono (si va atrás) y la firma de la marca */}
              <svg
                className="pieza3d__capa pieza3d__capa--cara"
                viewBox="0 0 300 300"
                style={{ transform: `translateZ(${-zFrente}px) rotateY(180deg)` }}
                aria-hidden="true"
              >
                <g fill={mezclar(c.hex, -0.08)}>{silueta}</g>
                {telDorso ? (
                  <>
                    <text x="150" y={yDorso} textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize={telDorso.length > 13 ? 19 : 22} fill={c.texto}>
                      {telDorso}
                    </text>
                    <text x="150" y={yDorso + 24} textAnchor="middle" fontFamily="Dancing Script, cursive" fontWeight="700" fontSize="17" fill={c.texto} opacity="0.75">
                      YosiArt
                    </text>
                  </>
                ) : (
                  <text x="150" y={NOMBRE_Y[forma] - 10} textAnchor="middle" fontFamily="Dancing Script, cursive" fontWeight="700" fontSize="28" fill={c.texto} opacity="0.75">
                    YosiArt
                  </text>
                )}
                <circle cx={300 - ax} cy={ay} r="9" fill={agujero} />
              </svg>

              {/* Argolla dorada, perpendicular a la pieza */}
              <svg
                className="pieza3d__capa"
                viewBox="0 0 300 300"
                style={{ transform: `translateX(${(ax - 150) * escala}px) rotateY(90deg)` }}
                aria-hidden="true"
              >
                <Argolla cy={ay - 32} r={32} />
              </svg>
            </>
          )}
        </div>
        {!tocado && <p className="pieza3d__pista">Arrastrá para girar</p>}
      </div>

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
    </div>
  );
};

export default Pieza3D;
