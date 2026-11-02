import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useAdminApi, fecha } from "./api";
import { achicarFoto } from "../../utils/foto";
import { mensajeDe } from "../../tipos";
import type { FotoGaleria } from "../../tipos";
import Icono from "../../components/Icono/Icono";

// Las fotos de la galería se guardan más grandes que las del carrito,
// para que al ampliarlas en el carrusel se vean los detalles.
const LADO_GALERIA = 1600;

const PanelGaleria = () => {
  const api = useAdminApi();
  const [fotos, setFotos] = useState<FotoGaleria[] | null>(null);
  const [titulo, setTitulo] = useState("");
  const [subiendo, setSubiendo] = useState<string | null>(null); // "2 de 5"
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setFotos(await api<FotoGaleria[]>("/api/galeria"));
      setError(null);
    } catch (err) {
      setError(mensajeDe(err));
    }
  }, [api]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Se pueden elegir varias a la vez; se suben de a una y todas llevan el
  // mismo título (se puede dejar vacío).
  const alElegir = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (!archivos.length) return;
    setError(null);
    setAviso(null);
    let subidas = 0;
    try {
      for (const [i, archivo] of archivos.entries()) {
        setSubiendo(`${i + 1} de ${archivos.length}`);
        const foto = await achicarFoto(archivo, { ladoMax: LADO_GALERIA });
        await api("/api/galeria", { method: "POST", body: { foto, titulo: titulo.trim() } });
        subidas++;
      }
      setTitulo("");
      setAviso(subidas === 1 ? "Foto agregada a la galería." : `${subidas} fotos agregadas a la galería.`);
    } catch (err) {
      setError(subidas ? `Se subieron ${subidas}, pero una falló: ${mensajeDe(err)}` : mensajeDe(err));
    } finally {
      setSubiendo(null);
      cargar();
    }
  };

  const borrar = async (f: FotoGaleria) => {
    if (!window.confirm(`¿Sacar ${f.titulo ? `"${f.titulo}"` : "esta foto"} de la galería?`)) return;
    try {
      await api(`/api/galeria/${f.id}`, { method: "DELETE" });
      cargar();
    } catch (err) {
      setError(mensajeDe(err));
    }
  };

  return (
    <section aria-label="Galería" className="adm-seccion">
      <p className="adm-suave">
        Las fotos de los trabajos terminados. Aparecen en el carrusel del inicio, la más nueva primero.
      </p>

      <div className="adm-card adm-galeria__subir">
        <div className="campo">
          <label htmlFor="gal-titulo">
            Título <span className="campo__opcional">(opcional, ej: "Chapita de Toby")</span>
          </label>
          <input id="gal-titulo" value={titulo} maxLength={80} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <label htmlFor="gal-fotos" className="subir-foto">
          <Icono nombre="subir" />
          {subiendo ? `Subiendo ${subiendo}…` : "Elegir fotos para subir"}
        </label>
        <input
          id="gal-fotos"
          type="file"
          accept="image/*"
          multiple
          className="solo-lectores"
          onChange={alElegir}
          disabled={!!subiendo}
        />
        {aviso && <p className="adm-ok">{aviso}</p>}
        {error && <p className="campo__error" role="alert">{error}</p>}
      </div>

      {!fotos && !error && <p className="adm-suave">Cargando galería…</p>}
      {fotos?.length === 0 && <p className="adm-vacio">Todavía no hay fotos. Las que subas aparecen en el inicio.</p>}
      {fotos && fotos.length > 0 && (
        <ul className="adm-galeria">
          {fotos.map((f) => (
            <li key={f.id} className="adm-galeria__item">
              <img src={f.foto} alt={f.titulo || "Trabajo terminado"} loading="lazy" />
              <div className="adm-galeria__pie">
                <span>
                  <strong>{f.titulo || "Sin título"}</strong>
                  <span className="adm-suave">{fecha(f.creado_en).split(",")[0]}</span>
                </span>
                <button type="button" className="adm-link" onClick={() => borrar(f)}>
                  Sacar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default PanelGaleria;
