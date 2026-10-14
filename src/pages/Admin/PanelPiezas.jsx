import { useCallback, useEffect, useState } from "react";
import { useAdminApi } from "./api";
import { useCatalogo } from "../../context/CatalogoContext";
import { FORMAS } from "../../data/formas";

// Un campo de precio vacío significa "a confirmar" (null en la API).
const aNumero = (v) => (v === "" || v == null ? null : Number(v));

const Pieza = ({ pieza, onGuardada }) => {
  const api = useAdminApi();
  const [datos, setDatos] = useState(() => ({
    ...pieza,
    precio: pieza.precio ?? "",
    precios_tamano: Object.fromEntries(Object.entries(pieza.precios_tamano || {}).map(([k, v]) => [k, String(v)])),
  }));
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [error, setError] = useState(null);

  const cambiar = (campo, valor) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setAviso(null);
  };
  const cambiarPrecioTamano = (clave, valor) =>
    cambiar("precios_tamano", { ...datos.precios_tamano, [clave]: valor });
  const cambiarCm = (forma, id, cm) =>
    cambiar("tamanos", {
      ...datos.tamanos,
      [forma]: datos.tamanos[forma].map((t) => (t.id === id ? { ...t, cm } : t)),
    });

  const guardar = async () => {
    setOcupado(true);
    setError(null);
    try {
      const precios = Object.fromEntries(
        Object.entries(datos.precios_tamano)
          .filter(([, v]) => v !== "" && v != null)
          .map(([k, v]) => [k, Number(v)])
      );
      const tamanos = Object.fromEntries(
        Object.entries(datos.tamanos || {}).map(([f, lista]) => [f, lista.map((t) => ({ ...t, cm: Number(t.cm) }))])
      );
      await api(`/api/productos/${pieza.id}`, {
        method: "PUT",
        body: {
          slug: datos.slug,
          nombre: datos.nombre,
          categoria: datos.categoria,
          descripcion: datos.descripcion,
          precio: aNumero(datos.precio),
          precios_tamano: precios,
          forma: datos.forma,
          formas: datos.formas,
          tamanos,
          lleva: datos.lleva,
          nuevo: datos.nuevo,
          orden: datos.orden,
          activo: datos.activo,
        },
      });
      setAviso("Guardado. La tienda ya muestra los cambios.");
      onGuardada();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  };

  const formasConTamano = Object.entries(datos.tamanos || {});

  return (
    <article className="adm-card adm-card--abierta">
      <div className="adm-card__cuerpo">
        <div className="adm-fila">
          <div className="campo">
            <label htmlFor={`nombre-${pieza.id}`}>Nombre</label>
            <input id={`nombre-${pieza.id}`} value={datos.nombre} onChange={(e) => cambiar("nombre", e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor={`precio-${pieza.id}`}>
              Precio base <span className="campo__opcional">(vacío = a confirmar)</span>
            </label>
            <input id={`precio-${pieza.id}`} type="number" min="0" value={datos.precio} onChange={(e) => cambiar("precio", e.target.value)} />
          </div>
        </div>

        <div className="campo">
          <label htmlFor={`desc-${pieza.id}`}>Descripción</label>
          <textarea id={`desc-${pieza.id}`} value={datos.descripcion} onChange={(e) => cambiar("descripcion", e.target.value)} />
        </div>

        {formasConTamano.length > 0 && (
          <div className="adm-tabla-wrap">
            <table className="adm-tabla">
              <caption>Precio y medida de cada tamaño (precio vacío = usa el precio base)</caption>
              <thead>
                <tr>
                  <th scope="col">Forma</th>
                  <th scope="col">Tamaño</th>
                  <th scope="col">Medida (cm)</th>
                  <th scope="col">Precio</th>
                </tr>
              </thead>
              <tbody>
                {formasConTamano.flatMap(([forma, lista]) =>
                  lista.map((t) => {
                    const clave = `${forma}:${t.id}`;
                    return (
                      <tr key={clave}>
                        <td>{FORMAS[forma]?.nombre || forma}</td>
                        <td>{t.nombre}</td>
                        <td>
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            aria-label={`Medida de ${FORMAS[forma]?.nombre} ${t.nombre}`}
                            value={t.cm}
                            onChange={(e) => cambiarCm(forma, t.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            aria-label={`Precio de ${FORMAS[forma]?.nombre} ${t.nombre}`}
                            value={datos.precios_tamano[clave] ?? ""}
                            placeholder={datos.precios_tamano[t.id] || (datos.precio === "" ? "A confirmar" : String(datos.precio))}
                            onChange={(e) => cambiarPrecioTamano(clave, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="adm-checks">
          <label>
            <input type="checkbox" checked={datos.activo} onChange={(e) => cambiar("activo", e.target.checked)} />
            Visible en la tienda
          </label>
          <label>
            <input type="checkbox" checked={datos.nuevo} onChange={(e) => cambiar("nuevo", e.target.checked)} />
            Marcar como «Nuevo»
          </label>
        </div>

        <div className="adm-acciones">
          <button type="button" className="btn" onClick={guardar} disabled={ocupado}>
            {ocupado ? "Guardando…" : "Guardar cambios"}
          </button>
          {aviso && <span className="adm-ok" role="status">{aviso}</span>}
        </div>
        {error && <p className="campo__error" role="alert">{error}</p>}
      </div>
    </article>
  );
};

const PanelPiezas = () => {
  const api = useAdminApi();
  const { recargar } = useCatalogo();
  const [piezas, setPiezas] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setPiezas(await api("/api/productos/todos"));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [api]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <section aria-label="Piezas" className="adm-seccion">
      <p className="adm-suave">Los precios que cargues acá son los que cobra la tienda. La medida en cm es la que ve el cliente.</p>
      {error && <p className="campo__error" role="alert">{error}</p>}
      {!piezas && !error && <p className="adm-suave">Cargando piezas…</p>}
      {piezas?.map((p) => (
        <div key={p.id}>
          <h2 className="adm-subtitulo">{p.nombre}</h2>
          <Pieza pieza={p} onGuardada={recargar} />
        </div>
      ))}
    </section>
  );
};

export default PanelPiezas;
