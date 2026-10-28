import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config";
import { buscarColor, buscarGlitter, buscarLetra, plata } from "../../data/piezas";
import { FORMAS } from "../../data/formas";
import "./Seguimiento.scss";

// Los pasos que recorre un pedido, en orden. "cancelado" va aparte.
const PASOS = [
  { id: "pendiente", nombre: "Recibido" },
  { id: "confirmado", nombre: "Confirmado" },
  { id: "en_preparacion", nombre: "En preparación" },
  { id: "listo", nombre: "Listo" },
  { id: "enviado", nombre: "Enviado" },
  { id: "entregado", nombre: "Entregado" },
];

const fecha = (iso) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// "Hueso grande · Frambuesa · Glitter dorado · «Luna» · Tel. en el dorso"
const describir = (p = {}) =>
  [
    FORMAS[p.forma] && (p.tamanoNombre ? `${FORMAS[p.forma].nombre} ${p.tamanoNombre.toLowerCase()}` : FORMAS[p.forma].nombre),
    p.color && buscarColor(p.color).nombre,
    p.glitter && p.glitter !== "sin" && `Glitter ${buscarGlitter(p.glitter).nombre.toLowerCase()}`,
    p.nombre && `«${p.nombre}»`,
    buscarLetra(p.letra) && `Letra ${buscarLetra(p.letra).nombre.toLowerCase()}`,
    p.telefono && `Tel. ${p.telefono}${p.telefonoLado === "dorso" ? " en el dorso" : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");

const Pedido = ({ pedido }) => {
  const cancelado = pedido.estado === "cancelado";
  const actual = PASOS.findIndex((p) => p.id === pedido.estado);
  // La fecha de cada paso sale del historial (la ultima vez que paso por ese estado).
  const fechaDe = (id) => [...pedido.historial].reverse().find((h) => h.estado === id)?.fecha;
  const notas = pedido.historial.filter((h) => h.nota && h.nota !== "Pedido recibido");

  return (
    <article className="pedido">
      <header className="pedido__cabecera">
        <div>
          <h2>Pedido #{pedido.numero}</h2>
          <p>Hecho el {fecha(pedido.creado_en)}</p>
        </div>
        <span className={`pedido__estado ${cancelado ? "pedido__estado--cancelado" : ""}`}>
          {cancelado ? "Cancelado" : PASOS[actual]?.nombre}
        </span>
      </header>

      {cancelado ? (
        <p className="pedido__aviso">Este pedido fue cancelado. Si no lo esperabas, escribinos.</p>
      ) : (
        <ol className="pasos-pedido" aria-label="Avance del pedido">
          {PASOS.map((paso, i) => {
            const hecho = i <= actual;
            return (
              <li
                key={paso.id}
                className={`pasos-pedido__paso ${hecho ? "pasos-pedido__paso--hecho" : ""} ${i === actual ? "pasos-pedido__paso--actual" : ""}`}
                aria-current={i === actual ? "step" : undefined}
              >
                <span className="pasos-pedido__punto" aria-hidden="true" />
                <span className="pasos-pedido__nombre">{paso.nombre}</span>
                {hecho && fechaDe(paso.id) && <span className="pasos-pedido__fecha">{fecha(fechaDe(paso.id))}</span>}
              </li>
            );
          })}
        </ol>
      )}

      {notas.length > 0 && (
        <ul className="pedido__notas">
          {notas.map((n, i) => (
            <li key={i}>
              <strong>{fecha(n.fecha)}:</strong> {n.nota}
            </li>
          ))}
        </ul>
      )}

      <ul className="pedido__items">
        {pedido.items.map((item, i) => (
          <li key={i}>
            {item.personalizacion?.foto && <img src={item.personalizacion.foto} alt="Foto que mandaste" />}
            <div>
              <strong>
                {item.cantidad} × {item.nombre}
              </strong>
              <span>{describir(item.personalizacion)}</span>
            </div>
          </li>
        ))}
      </ul>

      <p className="pedido__total">
        Total: <strong>{plata(pedido.total)}</strong>
      </p>
    </article>
  );
};

const Seguimiento = () => {
  const [params] = useSearchParams();
  const { logueado, token } = useAuth();

  const [numero, setNumero] = useState(params.get("numero") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const [buscado, setBuscado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(null);

  const [mios, setMios] = useState(null);
  const [errorMios, setErrorMios] = useState(null);

  // Con sesion iniciada, sus pedidos aparecen solos.
  useEffect(() => {
    if (!logueado) return;
    let vigente = true;
    fetch(`${API_URL}/api/pedidos/mis`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => vigente && setMios(d))
      .catch(() => vigente && setErrorMios("No pudimos cargar tus pedidos. Probá de nuevo en un momento."));
    return () => {
      vigente = false;
    };
  }, [logueado, token]);

  const buscar = async (e) => {
    e?.preventDefault();
    setError(null);
    setBuscado(null);
    if (!/^\d+$/.test(numero.trim().replace(/^#/, "")) || !email.trim()) {
      setError("Escribí el número de pedido (solo números) y el email con el que lo hiciste.");
      return;
    }
    setBuscando(true);
    try {
      const q = new URLSearchParams({ numero: numero.trim().replace(/^#/, ""), email: email.trim() });
      const res = await fetch(`${API_URL}/api/pedidos/seguimiento?${q}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No pudimos buscar el pedido.");
      setBuscado(data);
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "No pudimos conectarnos con el servidor. Probá de nuevo en un momento." : err.message);
    } finally {
      setBuscando(false);
    }
  };

  // Si llega desde el correo o el carrito con número y email, busca solo.
  useEffect(() => {
    if (params.get("numero") && params.get("email")) buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="seguimiento contenedor">
      <h1 className="titulo-seccion">Seguí tu pedido</h1>
      <p className="bajada">Mirá en qué paso está tu pedido, desde que lo recibimos hasta que te llega.</p>

      {logueado && (
        <section className="seguimiento__seccion" aria-label="Mis pedidos">
          <h2 className="seguimiento__subtitulo">Mis pedidos</h2>
          {errorMios && <p className="campo__error">{errorMios}</p>}
          {!mios && !errorMios && <p className="seguimiento__cargando">Cargando tus pedidos…</p>}
          {mios?.length === 0 && <p>Todavía no hiciste ningún pedido con tu cuenta.</p>}
          {mios?.map((p) => <Pedido key={p.id} pedido={p} />)}
        </section>
      )}

      <section className="seguimiento__seccion" aria-label="Buscar un pedido">
        {logueado && <h2 className="seguimiento__subtitulo">Buscar otro pedido</h2>}
        <form className="seguimiento__form" onSubmit={buscar} noValidate>
          <div className="campo">
            <label htmlFor="s-numero">Número de pedido</label>
            <input id="s-numero" inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ej: 0012" />
          </div>
          <div className="campo">
            <label htmlFor="s-email">Email del pedido</label>
            <input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <button type="submit" className="btn" disabled={buscando}>
            {buscando ? "Buscando…" : "Buscar"}
          </button>
        </form>
        {error && <p className="campo__error" role="alert">{error}</p>}
        {buscado && <Pedido pedido={buscado} />}
      </section>
    </main>
  );
};

export default Seguimiento;
