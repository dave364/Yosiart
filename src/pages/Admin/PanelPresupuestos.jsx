import { useCallback, useEffect, useState } from "react";
import { useAdminApi, fecha, telefonoLindo } from "./api";
import { plata } from "../../data/piezas";

const ESTADOS = [
  { id: "nuevo", nombre: "Nuevo" },
  { id: "respondido", nombre: "Respondido" },
  { id: "aceptado", nombre: "Aceptado" },
  { id: "rechazado", nombre: "Rechazado" },
];
const nombreEstado = (id) => ESTADOS.find((e) => e.id === id)?.nombre || id;

const Presupuesto = ({ p, onCambio }) => {
  const api = useAdminApi();
  const [abierto, setAbierto] = useState(p.estado === "nuevo");
  const [respuesta, setRespuesta] = useState("");
  const [precio, setPrecio] = useState(p.precio ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  const guardar = async (estado, conRespuesta) => {
    setOcupado(true);
    setError(null);
    try {
      await api(`/api/presupuestos/${p.id}`, {
        method: "PATCH",
        body: {
          estado,
          respuesta: conRespuesta ? respuesta.trim() : undefined,
          precio: precio === "" ? null : Number(precio),
        },
      });
      setRespuesta("");
      onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <article className={`adm-card ${abierto ? "adm-card--abierta" : ""}`}>
      <button type="button" className="adm-card__cabecera" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
        <span className="adm-card__titulo">
          {p.tipo} · {p.nombre}
        </span>
        <span className="adm-suave">{fecha(p.creado_en)}</span>
        <span className="adm-card__derecha">
          {p.precio != null && <strong>{plata(p.precio)}</strong>}
          <span className={`adm-chip adm-chip--p-${p.estado}`}>{nombreEstado(p.estado)}</span>
        </span>
      </button>

      {abierto && (
        <div className="adm-card__cuerpo">
          <p className="adm-contacto">
            <span>{p.email}</span>
            {p.telefono && <span>{telefonoLindo(p.telefono)}</span>}
            {p.cantidad && <span>{p.cantidad} unidades</span>}
            {p.fecha_evento && <span>Para el {new Date(p.fecha_evento).toLocaleDateString("es-AR", { timeZone: "UTC" })}</span>}
          </p>
          <p className="adm-texto">{p.descripcion}</p>

          {p.fotos.length > 0 && (
            <div className="adm-fotos">
              {p.fotos.map((f, i) => (
                <a key={f} href={f} target="_blank" rel="noreferrer">
                  <img src={f} alt={`Referencia ${i + 1}`} />
                </a>
              ))}
            </div>
          )}

          {p.respuesta && (
            <div className="adm-respondido">
              <strong>Tu última respuesta:</strong>
              <p className="adm-texto">{p.respuesta}</p>
            </div>
          )}

          <div className="campo">
            <label htmlFor={`resp-${p.id}`}>Respuesta para el cliente (le llega por correo)</label>
            <textarea
              id={`resp-${p.id}`}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Ej: 40 llaveros lila con glitter, $2.500 c/u. Demora 10 días."
            />
          </div>
          <div className="adm-fila">
            <div className="campo">
              <label htmlFor={`precio-${p.id}`}>
                Precio total <span className="campo__opcional">(opcional)</span>
              </label>
              <input id={`precio-${p.id}`} type="number" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} />
            </div>
          </div>

          <div className="adm-acciones">
            <button type="button" className="btn" onClick={() => guardar("respondido", true)} disabled={ocupado || respuesta.trim().length < 5}>
              Enviar respuesta
            </button>
            <button type="button" className="btn btn--borde" onClick={() => guardar("aceptado", false)} disabled={ocupado}>
              Marcar aceptado
            </button>
            <button type="button" className="btn btn--borde" onClick={() => guardar("rechazado", false)} disabled={ocupado}>
              Marcar rechazado
            </button>
          </div>
          {error && <p className="campo__error" role="alert">{error}</p>}
        </div>
      )}
    </article>
  );
};

const PanelPresupuestos = () => {
  const api = useAdminApi();
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState("nuevo");
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setLista(await api("/api/presupuestos"));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [api]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = lista?.filter((p) => filtro === "todos" || p.estado === filtro) ?? [];

  return (
    <section aria-label="Presupuestos" className="adm-seccion">
      <div className="adm-filtros" role="group" aria-label="Filtrar presupuestos">
        {ESTADOS.map((e) => (
          <button key={e.id} type="button" className="chip" aria-pressed={filtro === e.id} onClick={() => setFiltro(e.id)}>
            {e.nombre} ({lista?.filter((p) => p.estado === e.id).length ?? 0})
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={filtro === "todos"} onClick={() => setFiltro("todos")}>
          Todos ({lista?.length ?? 0})
        </button>
        <button type="button" className="adm-actualizar" onClick={cargar}>
          Actualizar
        </button>
      </div>
      {error && <p className="campo__error" role="alert">{error}</p>}
      {!lista && !error && <p className="adm-suave">Cargando presupuestos…</p>}
      {lista && visibles.length === 0 && <p className="adm-vacio">No hay presupuestos en esta lista.</p>}
      {visibles.map((p) => (
        <Presupuesto key={p.id} p={p} onCambio={cargar} />
      ))}
    </section>
  );
};

export default PanelPresupuestos;
