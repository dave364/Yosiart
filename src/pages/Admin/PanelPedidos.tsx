import { useCallback, useEffect, useState } from "react";
import { useAdminApi, fecha, telefonoLindo } from "./api";
import { plata, buscarColor, buscarGlitter, buscarLetra } from "../../data/piezas";
import { FORMAS } from "../../data/formas";
import PiezaPreview from "../../components/PiezaPreview/PiezaPreview";
import { mensajeDe } from "../../tipos";
import type { Pedido as PedidoT, PersonalizacionGuardada } from "../../tipos";

const ESTADOS = [
  { id: "pendiente", nombre: "Recibido" },
  { id: "confirmado", nombre: "Confirmado" },
  { id: "en_preparacion", nombre: "En preparación" },
  { id: "listo", nombre: "Listo" },
  { id: "enviado", nombre: "Enviado" },
  { id: "entregado", nombre: "Entregado" },
  { id: "cancelado", nombre: "Cancelado" },
];
const nombreEstado = (id: string) => ESTADOS.find((e) => e.id === id)?.nombre || id;
// El paso que sigue en el taller (los terminados no tienen siguiente).
const siguiente = (id: string) => {
  const i = ESTADOS.findIndex((e) => e.id === id);
  return id === "entregado" || id === "cancelado" ? null : ESTADOS[i + 1];
};

const Detalle = ({ p }: { p: PersonalizacionGuardada }) => (
  <dl className="adm-detalle">
    {p.forma && FORMAS[p.forma] && (
      <>
        <dt>Forma</dt>
        <dd>
          {FORMAS[p.forma].nombre}
          {p.tamanoNombre && ` ${p.tamanoNombre.toLowerCase()} (≈ ${String(p.tamanoCm).replace(".", ",")} cm)`}
        </dd>
      </>
    )}
    <dt>Color</dt>
    <dd>
      {buscarColor(p.color).nombre} · {buscarGlitter(p.glitter).nombre}
    </dd>
    {p.nombre && (
      <>
        <dt>Nombre</dt>
        <dd className="adm-detalle__grande">{p.nombre}</dd>
      </>
    )}
    {buscarLetra(p.letra) && (
      <>
        <dt>Letra</dt>
        <dd>{buscarLetra(p.letra)!.nombre}</dd>
      </>
    )}
    {p.telefono && (
      <>
        <dt>Teléfono</dt>
        <dd>
          {p.telefono} <span className="adm-suave">({p.telefonoLado === "dorso" ? "en el dorso" : "adelante"})</span>
        </dd>
      </>
    )}
  </dl>
);

const Pedido = ({ pedido, onCambio }: { pedido: PedidoT; onCambio: () => void }) => {
  const api = useAdminApi();
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [total, setTotal] = useState<number | string>(pedido.total ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sig = siguiente(pedido.estado);

  const cambiarEstado = async (estado: string) => {
    if (estado === "cancelado" && !window.confirm(`¿Cancelar el pedido #${pedido.numero}? Al cliente le llega un correo.`)) return;
    setOcupado(true);
    setError(null);
    try {
      await api(`/api/pedidos/${pedido.id}/estado`, { method: "PATCH", body: { estado, nota: nota.trim() || undefined } });
      setNota("");
      onCambio();
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setOcupado(false);
    }
  };

  const guardarTotal = async () => {
    setOcupado(true);
    setError(null);
    try {
      await api(`/api/pedidos/${pedido.id}/total`, { method: "PATCH", body: { total: Number(total) } });
      onCambio();
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <article className={`adm-card ${abierto ? "adm-card--abierta" : ""}`}>
      <button type="button" className="adm-card__cabecera" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
        <span className="adm-card__titulo">
          #{pedido.numero} · {pedido.cliente_nombre}
        </span>
        <span className="adm-suave">{fecha(pedido.creado_en)}</span>
        <span className="adm-card__derecha">
          <strong>{plata(pedido.total)}</strong>
          <span className={`adm-chip adm-chip--${pedido.estado}`}>{nombreEstado(pedido.estado)}</span>
        </span>
      </button>

      {abierto && (
        <div className="adm-card__cuerpo">
          <p className="adm-contacto">
            <span>{pedido.cliente_email}</span>
            <span>{telefonoLindo(pedido.cliente_telefono)}</span>
            <span className="adm-suave">{pedido.usuario_id ? "Cliente con cuenta" : "Compra como invitado"}</span>
          </p>

          <ul className="adm-items">
            {pedido.items.map((item, i) => {
              const p = item.personalizacion || {};
              return (
                <li key={i} className="adm-item">
                  <div className="adm-item__preview">
                    <PiezaPreview forma={p.forma} {...p} etiqueta={`${item.nombre} ${p.nombre || ""}`} />
                  </div>
                  <div className="adm-item__info">
                    <strong>
                      {item.cantidad} × {item.nombre}
                    </strong>
                    <Detalle p={p} />
                    {p.foto && (
                      <a href={p.foto} target="_blank" rel="noreferrer" className="adm-foto">
                        <img src={p.foto} alt="Foto que mandó el cliente" />
                        Ver la foto en grande
                      </a>
                    )}
                  </div>
                  <span className="adm-item__precio">
                    {item.precio_unitario == null ? "A confirmar" : plata(item.precio_unitario * item.cantidad)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="adm-fila">
            <div className="campo">
              <label htmlFor={`total-${pedido.id}`}>Total del pedido</label>
              <input id={`total-${pedido.id}`} type="number" min="0" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Ej: 9500" />
            </div>
            <button type="button" className="btn btn--borde" onClick={guardarTotal} disabled={ocupado || total === "" || Number(total) === pedido.total}>
              Guardar total
            </button>
          </div>

          <div className="campo">
            <label htmlFor={`nota-${pedido.id}`}>
              Nota para el cliente <span className="campo__opcional">(opcional, va en el correo)</span>
            </label>
            <textarea id={`nota-${pedido.id}`} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: ¡Ya salió del molde! Mañana lo pulimos." />
          </div>

          <div className="adm-acciones">
            {sig && (
              <button type="button" className="btn" onClick={() => cambiarEstado(sig.id)} disabled={ocupado}>
                Pasar a «{sig.nombre}»
              </button>
            )}
            <label className="adm-select">
              <span className="solo-lectores">Cambiar a otro estado</span>
              <select value="" onChange={(e) => e.target.value && cambiarEstado(e.target.value)} disabled={ocupado}>
                <option value="">Otro estado…</option>
                {ESTADOS.filter((e) => e.id !== pedido.estado).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="campo__error" role="alert">{error}</p>}

          <details className="adm-historial">
            <summary>Historial ({pedido.historial?.length ?? 0})</summary>
            <ul>
              {(pedido.historial ?? []).map((h, i) => (
                <li key={i}>
                  <strong>{nombreEstado(h.estado)}</strong> · {fecha(h.fecha)}
                  {h.nota && ` — ${h.nota}`}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </article>
  );
};

const PanelPedidos = () => {
  const api = useAdminApi();
  const [pedidos, setPedidos] = useState<PedidoT[] | null>(null);
  const [filtro, setFiltro] = useState("activos");
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setPedidos(await api<PedidoT[]>("/api/pedidos"));
      setError(null);
    } catch (err) {
      setError(mensajeDe(err));
    }
  }, [api]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cuenta = (id: string) => pedidos?.filter((p) => p.estado === id).length ?? 0;
  const activos = (p: PedidoT) => !["entregado", "cancelado"].includes(p.estado);
  const visibles =
    pedidos?.filter((p) => (filtro === "activos" ? activos(p) : filtro === "todos" ? true : p.estado === filtro)) ?? [];

  return (
    <section aria-label="Pedidos" className="adm-seccion">
      <div className="adm-filtros" role="group" aria-label="Filtrar pedidos">
        <button type="button" className="chip" aria-pressed={filtro === "activos"} onClick={() => setFiltro("activos")}>
          En curso ({pedidos?.filter(activos).length ?? 0})
        </button>
        {ESTADOS.map((e) => (
          <button key={e.id} type="button" className="chip" aria-pressed={filtro === e.id} onClick={() => setFiltro(e.id)}>
            {e.nombre} ({cuenta(e.id)})
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={filtro === "todos"} onClick={() => setFiltro("todos")}>
          Todos ({pedidos?.length ?? 0})
        </button>
        <button type="button" className="adm-actualizar" onClick={cargar}>
          Actualizar
        </button>
      </div>

      {error && <p className="campo__error" role="alert">{error}</p>}
      {!pedidos && !error && <p className="adm-suave">Cargando pedidos…</p>}
      {pedidos && visibles.length === 0 && <p className="adm-vacio">No hay pedidos en esta lista.</p>}
      {visibles.map((p) => (
        <Pedido key={p.id} pedido={p} onCambio={cargar} />
      ))}
    </section>
  );
};

export default PanelPedidos;
