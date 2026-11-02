import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent as MouseEventReact, PointerEvent } from "react";
import type { FotoGaleria } from "../../tipos";
import "./Galeria3D.scss";

// Carrusel 3D de trabajos terminados.
//
// Las fotos van sobre una elipse acostada (un óvalo visto un poco desde
// arriba): adelante quedan más grandes y nítidas; atrás, más chicas,
// más altas y apagadas. La posición de cada una se calcula en cada cuadro
// a partir de un solo número, el ángulo de giro.
//
// - Gira sola despacio (salvo que la persona prefiera menos movimiento).
// - Se arrastra de costado, con inercia, o se mueve con las flechas.
// - Tocar una foto de costado la trae al frente; tocar la del frente la
//   abre ampliada. Ahí, tocar la foto la acerca más para ver detalles.

const VELOCIDAD_AUTO = 0.006; // grados por milisegundo
const ARRASTRE = 0.25; // grados por píxel arrastrado

const normalizar = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
const suave = (t: number) => t * t * (3 - 2 * t);

// Dónde se ve una tarjeta en pantalla (centro y ancho), con la perspectiva.
const PERSPECTIVA = 1300;
const proyectar = (grados: number, rx: number, rz: number, ancho: number) => {
  const theta = (grados * Math.PI) / 180;
  const z = Math.cos(theta) * rz;
  const f = PERSPECTIVA / (PERSPECTIVA - z);
  const escala = 0.62 + ((z + rz) / (2 * rz)) * 0.48;
  return { x: Math.sin(theta) * rx * f, w: ancho * escala * f };
};

// La foto que se va del frente se vuelve transparente justo en la parte que
// tapa a la siguiente. Al cruzarse (medio paso) esa parte ya es invisible, así
// que cuando la nueva pasa adelante no hay salto. Después el borde suave se
// apaga de a poco, ya tapado por la nueva.
const mascaraSalida = (
  grados: number,
  direccion: number,
  paso: number,
  rx: number,
  rz: number,
  ancho: number,
) => {
  if (!direccion || grados * direccion <= 0) return "none"; // no es la que se va
  const medio = paso / 2;
  const d = Math.abs(grados);
  if (d >= paso * 1.5) return "none";
  const sale = proyectar(grados, rx, rz, ancho);
  const entra = proyectar(grados - direccion * paso, rx, rz, ancho);
  // Cuánto de la que se va queda encima de la que entra (0 a 1 de su ancho).
  const tapa = Math.max(0, Math.min(1, (sale.w / 2 + entra.w / 2 - Math.abs(entra.x - sale.x)) / sale.w));
  const avance = d <= medio ? suave(d / medio) : 1;
  const borde = d <= medio ? 1 : Math.max(0, 1 - (d - medio) / paso);
  const claro = tapa * avance; // parte totalmente transparente
  const rampa = 0.22 * borde * avance; // transición suave hacia lo opaco
  if (claro + rampa < 0.01) return "none";
  const lado = grados < 0 ? "to left" : "to right";
  return `linear-gradient(${lado}, transparent ${(claro * 100).toFixed(1)}%, #000 ${((claro + rampa) * 100).toFixed(1)}%)`;
};

interface Props {
  fotos: FotoGaleria[];
}

const Galeria3D = ({ fotos }: Props) => {
  const escenaRef = useRef<HTMLDivElement>(null);
  const tarjetasRef = useRef<(HTMLButtonElement | null)[]>([]);
  const giro = useRef({ angulo: 0, anterior: 0, direccion: -1, vel: 0, objetivo: null as number | null, arrastrando: false, x: 0, movido: 0 });
  const reducir = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const pausa = useRef(false); // el mouse está encima o hay una foto ampliada
  const visible = useRef(true);
  const [frente, setFrente] = useState(0);
  const [abierta, setAbierta] = useState<number | null>(null);

  const n = fotos.length;
  const paso = 360 / Math.max(n, 1);

  // Ubica cada foto sobre la elipse según el ángulo actual.
  const pintar = useCallback(() => {
    const escena = escenaRef.current;
    if (!escena) return;
    const ancho = escena.clientWidth;
    const celular = ancho < 640;
    const rx = celular ? ancho * 0.44 : Math.min(ancho * 0.4, 480); // radio horizontal
    const rz = rx * 0.55; // radio de profundidad: por eso se ve ovalado
    const alto = celular ? 52 : 78; // cuánto suben las de atrás (vista desde arriba)
    let masCerca = 0;
    let mejorZ = -Infinity;
    const g = giro.current;
    const cambio = g.angulo - g.anterior;
    if (Math.abs(cambio) > 1e-4) g.direccion = Math.sign(cambio);
    g.anterior = g.angulo;
    tarjetasRef.current.forEach((el, i) => {
      if (!el) return;
      // Entre -180° y 180°: así la inclinación no sigue creciendo vuelta tras vuelta.
      const grados = normalizar(i * paso + giro.current.angulo);
      const theta = (grados * Math.PI) / 180;
      const x = Math.sin(theta) * rx;
      const z = Math.cos(theta) * rz;
      const cerca = (z + rz) / (2 * rz); // 1 = adelante, 0 = atrás
      const y = (1 - cerca) * -alto; // las de atrás quedan más arriba
      const escala = 0.62 + cerca * 0.48;
      el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateY(${grados * 0.35}deg) scale(${escala})`;
      el.style.zIndex = String(Math.round(cerca * 100));
      el.style.filter = `brightness(${0.55 + cerca * 0.45}) saturate(${0.6 + cerca * 0.4})`;
      el.style.opacity = String(0.35 + cerca * 0.65);
      // Solo en el celular: ahí las fotos se tapan entre sí. En la computadora
      // quedan una al lado de la otra y no hace falta.
      const mascara = celular ? mascaraSalida(grados, g.direccion, paso, rx, rz, el.offsetWidth) : "none";
      el.style.maskImage = mascara;
      el.style.webkitMaskImage = mascara;
      if (z > mejorZ) {
        mejorZ = z;
        masCerca = i;
      }
    });
    setFrente((f) => (f === masCerca ? f : masCerca));
  }, [paso]);

  // Bucle de animación: giro automático, inercia y llegada suave a una foto.
  useEffect(() => {
    let raf = 0;
    let prev = 0;
    const cuadro = (t: number) => {
      const dt = Math.min(50, t - (prev || t));
      prev = t;
      const g = giro.current;
      if (!g.arrastrando && visible.current) {
        if (g.objetivo != null) {
          g.angulo += (g.objetivo - g.angulo) * Math.min(1, dt / 140);
          if (Math.abs(g.objetivo - g.angulo) < 0.05) {
            g.angulo = g.objetivo;
            g.objetivo = null;
          }
        } else if (Math.abs(g.vel) > 0.002) {
          g.angulo += g.vel * dt;
          g.vel *= Math.pow(0.92, dt / 16);
        } else if (!reducir && !pausa.current) {
          g.angulo -= VELOCIDAD_AUTO * dt;
        }
        pintar();
      }
      raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(raf);
  }, [pintar, reducir]);

  // Fuera de pantalla no se anima.
  useEffect(() => {
    const el = escenaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = !!e?.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Lleva la foto i al frente por el camino más corto.
  const irA = (i: number) => {
    const g = giro.current;
    g.vel = 0;
    g.objetivo = g.angulo + normalizar(-(i * paso) - g.angulo);
  };
  const mover = (pasos: number) => irA((((frente + pasos) % n) + n) % n);

  const alApretar = (e: PointerEvent<HTMLDivElement>) => {
    const g = giro.current;
    g.arrastrando = true;
    g.objetivo = null;
    g.vel = 0;
    g.x = e.clientX;
    g.movido = 0;
  };
  const alMover = (e: PointerEvent<HTMLDivElement>) => {
    const g = giro.current;
    if (!g.arrastrando) return;
    const dx = e.clientX - g.x;
    g.x = e.clientX;
    g.movido += Math.abs(dx);
    // Recién después de unos píxeles cuenta como arrastre (y no como toque).
    if (g.movido > 6) escenaRef.current?.setPointerCapture(e.pointerId);
    g.angulo += dx * ARRASTRE;
    g.vel = Math.max(-0.5, Math.min(0.5, (dx * ARRASTRE) / 16));
    pintar();
  };
  const alSoltar = () => {
    giro.current.arrastrando = false;
    // El clic llega justo después de soltar; ahí todavía se sabe si fue arrastre.
    setTimeout(() => (giro.current.movido = 0), 0);
  };

  const alTocar = (i: number) => {
    if (giro.current.movido > 6) return; // fue un arrastre
    if (i === frente) setAbierta(i);
    else irA(i);
  };

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") mover(-1);
    else if (e.key === "ArrowRight") mover(1);
    else return;
    e.preventDefault();
  };

  useEffect(() => {
    pausa.current = abierta != null;
  }, [abierta]);

  if (!n) return null;
  const actual = fotos[frente];

  return (
    <div className="galeria3d">
      <div
        ref={escenaRef}
        className="galeria3d__escena"
        role="group"
        aria-roledescription="carrusel"
        aria-label="Trabajos terminados. Usá las flechas para recorrerlos."
        tabIndex={0}
        onPointerDown={alApretar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onMouseEnter={() => (pausa.current = true)}
        onMouseLeave={() => (pausa.current = abierta != null)}
        onKeyDown={alTeclear}
      >
        {fotos.map((f, i) => (
          <button
            key={f.id}
            ref={(el) => {
              tarjetasRef.current[i] = el;
            }}
            type="button"
            className={`galeria3d__tarjeta${i === frente ? " galeria3d__tarjeta--frente" : ""}`}
            onClick={() => alTocar(i)}
            tabIndex={i === frente ? 0 : -1}
            aria-label={i === frente ? `Ampliar ${f.titulo || "foto"}` : `Ver ${f.titulo || `foto ${i + 1}`}`}
          >
            <img src={f.foto} alt={f.titulo || "Trabajo terminado de YosiArt"} loading="lazy" draggable={false} />
          </button>
        ))}
        <div className="galeria3d__piso" aria-hidden="true" />
      </div>

      <div className="galeria3d__controles">
        <button type="button" className="galeria3d__flecha" onClick={() => mover(-1)} aria-label="Foto anterior">
          ‹
        </button>
        <p className="galeria3d__titulo" aria-live="polite">
          {actual?.titulo || "Tocá la foto para verla de cerca"}
          <span>
            {frente + 1} / {n}
          </span>
        </p>
        <button type="button" className="galeria3d__flecha" onClick={() => mover(1)} aria-label="Foto siguiente">
          ›
        </button>
      </div>

      {abierta != null && (
        <Ampliada
          fotos={fotos}
          indice={abierta}
          onCambiar={(i) => {
            setAbierta(i);
            irA(i);
          }}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </div>
  );
};

// Foto ampliada. Tocar la foto la acerca al doble, hacia el punto tocado,
// y mover el mouse (o el dedo) recorre los detalles.
const Ampliada = ({
  fotos,
  indice,
  onCambiar,
  onCerrar,
}: {
  fotos: FotoGaleria[];
  indice: number;
  onCambiar: (i: number) => void;
  onCerrar: () => void;
}) => {
  const [zoom, setZoom] = useState(false);
  const [origen, setOrigen] = useState("50% 50%");
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const foto = fotos[indice]!;
  const n = fotos.length;

  const cambiar = useCallback(
    (pasos: number) => {
      setZoom(false);
      onCambiar((((indice + pasos) % n) + n) % n);
    },
    [indice, n, onCambiar]
  );

  // Teclado, foco y la página quieta detrás mientras está abierta.
  useEffect(() => {
    const alTeclear = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      if (e.key === "ArrowLeft") cambiar(-1);
      if (e.key === "ArrowRight") cambiar(1);
    };
    document.addEventListener("keydown", alTeclear);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
    };
  }, [cambiar, onCerrar]);

  const puntoDe = (e: { clientX: number; clientY: number; currentTarget: HTMLElement }) => {
    const r = e.currentTarget.getBoundingClientRect();
    return `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  };

  const alTocarFoto = (e: MouseEventReact<HTMLImageElement>) => {
    e.stopPropagation();
    setOrigen(puntoDe(e));
    setZoom((z) => !z);
  };

  return (
    <div className="ampliada" role="dialog" aria-modal="true" aria-label={foto.titulo || "Foto ampliada"} onClick={onCerrar}>
      <button ref={cerrarRef} type="button" className="ampliada__cerrar" onClick={onCerrar} aria-label="Cerrar">
        ×
      </button>
      {n > 1 && (
        <>
          <button
            type="button"
            className="ampliada__flecha ampliada__flecha--izq"
            onClick={(e) => {
              e.stopPropagation();
              cambiar(-1);
            }}
            aria-label="Foto anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="ampliada__flecha ampliada__flecha--der"
            onClick={(e) => {
              e.stopPropagation();
              cambiar(1);
            }}
            aria-label="Foto siguiente"
          >
            ›
          </button>
        </>
      )}
      <figure className="ampliada__figura" onClick={(e) => e.stopPropagation()}>
        <div className="ampliada__marco">
          <img
            key={foto.id}
            src={foto.foto}
            alt={foto.titulo || "Trabajo terminado de YosiArt"}
            className={zoom ? "ampliada__img ampliada__img--zoom" : "ampliada__img"}
            style={{ transformOrigin: origen }}
            onClick={alTocarFoto}
            onPointerMove={(e) => zoom && setOrigen(puntoDe(e))}
            draggable={false}
          />
        </div>
        <figcaption>
          {foto.titulo && <strong>{foto.titulo}</strong>}
          <span>{zoom ? "Tocá de nuevo para alejar" : "Tocá la foto para acercarla"}</span>
        </figcaption>
      </figure>
    </div>
  );
};

export default Galeria3D;
