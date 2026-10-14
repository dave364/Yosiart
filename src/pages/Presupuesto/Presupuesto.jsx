import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { achicarFoto } from "../../utils/foto";
import { normalizarTelefono, telefonoParece } from "../../utils/telefono";
import { API_URL } from "../../config";
import Icono from "../../components/Icono/Icono";
import "./Presupuesto.scss";

const TIPOS = ["Souvenirs para un evento", "Pieza única a medida", "Regalo personalizado", "Otro"];
const MAX_FOTOS = 3;

const emailParece = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const Presupuesto = () => {
  const { usuario, token } = useAuth();

  const [datos, setDatos] = useState({
    nombre: usuario?.nombre || "",
    email: usuario?.email || "",
    telefono: usuario?.telefono || "",
    tipo: TIPOS[0],
    cantidad: "",
    fecha: "",
    descripcion: "",
  });
  const [fotos, setFotos] = useState([]);
  const [errorFotos, setErrorFotos] = useState(null);
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [enviado, setEnviado] = useState(false);

  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const alElegirFotos = async (e) => {
    const archivos = Array.from(e.target.files || []).slice(0, MAX_FOTOS - fotos.length);
    e.target.value = "";
    setErrorFotos(null);
    try {
      const nuevas = await Promise.all(archivos.map(achicarFoto));
      setFotos((f) => [...f, ...nuevas].slice(0, MAX_FOTOS));
    } catch (err) {
      setErrorFotos(err.message);
    }
  };

  const errores = {
    nombre: datos.nombre.trim().length < 2 ? "Escribí tu nombre." : null,
    email: !emailParece(datos.email) ? "Escribí un email válido: ahí te mandamos el presupuesto." : null,
    telefono:
      datos.telefono.trim() && !telefonoParece(datos.telefono)
        ? "Tiene que tener 10 dígitos con el código de área."
        : null,
    descripcion: datos.descripcion.trim().length < 10 ? "Contanos un poco más de lo que imaginás." : null,
  };
  const valido = Object.values(errores).every((v) => !v);

  const enviar = async (e) => {
    e.preventDefault();
    setIntento(true);
    if (!valido) return;
    setEnviando(true);
    setError(null);
    try {
      // TODO (backend): crear POST /api/presupuestos en la API de YosiArt.
      const res = await fetch(`${API_URL}/api/presupuestos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...datos,
          nombre: datos.nombre.trim(),
          email: datos.email.trim(),
          telefono: datos.telefono.trim() ? normalizarTelefono(datos.telefono) : null,
          cantidad: datos.cantidad ? Number(datos.cantidad) : null,
          fotos,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No pudimos enviar tu pedido de presupuesto.");
      setEnviado(true);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "No pudimos conectarnos con el servidor. Probá de nuevo en un momento."
          : err.message
      );
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <main className="presupuesto contenedor">
        <div className="presupuesto__listo">
          <h1 className="titulo-seccion">¡Recibimos tu idea!</h1>
          <p>Te escribimos a <strong>{datos.email.trim()}</strong> con el presupuesto.</p>
          <Link to="/" className="btn">Volver al inicio</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="presupuesto contenedor">
      <h1 className="titulo-seccion">Pedí tu presupuesto</h1>
      <p className="bajada">Contanos qué imaginás y te respondemos con el precio y la demora.</p>

      <form className="presupuesto__form" onSubmit={enviar} noValidate>
        <div className="presupuesto__fila">
          <div className="campo">
            <label htmlFor="p-nombre">Nombre</label>
            <input id="p-nombre" value={datos.nombre} onChange={cambiar("nombre")} autoComplete="name" />
            {intento && errores.nombre && <span className="campo__error">{errores.nombre}</span>}
          </div>
          <div className="campo">
            <label htmlFor="p-email">Email</label>
            <input id="p-email" type="email" value={datos.email} onChange={cambiar("email")} autoComplete="email" />
            {intento && errores.email && <span className="campo__error">{errores.email}</span>}
          </div>
        </div>

        <div className="presupuesto__fila">
          <div className="campo">
            <label htmlFor="p-tel">
              Teléfono <span className="campo__opcional">(opcional)</span>
            </label>
            <input id="p-tel" type="tel" value={datos.telefono} onChange={cambiar("telefono")} autoComplete="tel" />
            {intento && errores.telefono && <span className="campo__error">{errores.telefono}</span>}
          </div>
          <div className="campo">
            <label htmlFor="p-tipo">¿Qué necesitás?</label>
            <select id="p-tipo" value={datos.tipo} onChange={cambiar("tipo")}>
              {TIPOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="presupuesto__fila">
          <div className="campo">
            <label htmlFor="p-cantidad">
              Cantidad aproximada <span className="campo__opcional">(opcional)</span>
            </label>
            <input id="p-cantidad" type="number" min="1" value={datos.cantidad} onChange={cambiar("cantidad")} />
          </div>
          <div className="campo">
            <label htmlFor="p-fecha">
              ¿Para cuándo lo necesitás? <span className="campo__opcional">(opcional)</span>
            </label>
            <input id="p-fecha" type="date" value={datos.fecha} onChange={cambiar("fecha")} />
          </div>
        </div>

        <div className="campo">
          <label htmlFor="p-desc">Contanos tu idea</label>
          <textarea
            id="p-desc"
            value={datos.descripcion}
            onChange={cambiar("descripcion")}
            placeholder="Ej: 40 llaveros para los 15 de mi hija, en lila con glitter plateado y su nombre…"
          />
          {intento && errores.descripcion && <span className="campo__error">{errores.descripcion}</span>}
        </div>

        <div className="campo">
          <span className="campo__titulo">
            Imágenes de referencia <span className="campo__opcional">(opcional, hasta {MAX_FOTOS})</span>
          </span>
          <div className="presupuesto__fotos">
            {fotos.map((f, i) => (
              <div key={i} className="presupuesto__foto">
                <img src={f} alt={`Referencia ${i + 1}`} />
                <button type="button" aria-label={`Quitar referencia ${i + 1}`} onClick={() => setFotos((fs) => fs.filter((_, j) => j !== i))}>
                  <Icono nombre="cerrar" size={16} />
                </button>
              </div>
            ))}
            {fotos.length < MAX_FOTOS && (
              <label htmlFor="p-fotos" className="subir-foto presupuesto__subir">
                <Icono nombre="subir" />
                Agregar imagen
              </label>
            )}
          </div>
          <input id="p-fotos" type="file" accept="image/*" multiple className="solo-lectores" onChange={alElegirFotos} />
          {errorFotos && <span className="campo__error">{errorFotos}</span>}
        </div>

        {error && <p className="campo__error" role="alert">{error}</p>}

        <button type="submit" className="btn btn--grande" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar pedido de presupuesto"}
        </button>
      </form>
    </main>
  );
};

export default Presupuesto;
