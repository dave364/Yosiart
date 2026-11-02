import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useAdminApi, fecha } from "./api";
import { achicarFoto } from "../../utils/foto";
import { mensajeDe } from "../../tipos";
import type { FotoGaleria } from "../../tipos";
import Icono from "../../components/Icono/Icono";

// Una foto de la lista: su título se puede cambiar ahí mismo, y las
// flechas la mueven antes o después en el carrusel.
const ItemGaleria = ({
  foto,
  posicion,
  total,
  onMover,
  onBorrar,
  onGuardada,
}: {
  foto: FotoGaleria;
  posicion: number;
  total: number;
  onMover: (desde: number, hacia: number) => void;
  onBorrar: (f: FotoGaleria) => void;
  onGuardada: (f: FotoGaleria) => void;
}) => {
  const api = useAdminApi();
  const [titulo, setTitulo] = useState(foto.titulo);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cambio = titulo.trim() !== foto.titulo;

  const guardar = async () => {
    if (!cambio) return;
    setGuardando(true);
    setError(null);
    try {
      const nueva = await api<FotoGaleria>(`/api/galeria/${foto.id}`, { method: "PATCH", body: { titulo: titulo.trim() } });
      setTitulo(nueva.titulo);
      onGuardada(nueva);
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <li className="adm-galeria__item">
      <div className="adm-galeria__foto">
        <img src={foto.foto} alt={foto.titulo || "Trabajo terminado"} loading="lazy" />
        <span className="adm-galeria__numero">{posicion + 1}</span>
      </div>
      <div className="adm-galeria__pie">
        <form
          className="adm-galeria__titulo"
          onSubmit={(e) => {
            e.preventDefault();
            guardar();
          }}
        >
          <label className="solo-lectores" htmlFor={`titulo-${foto.id}`}>
            Título de la foto {posicion + 1}
          </label>
          <input
            id={`titulo-${foto.id}`}
            value={titulo}
            maxLength={80}
            placeholder="Sin título"
            onChange={(e) => setTitulo(e.target.value)}
          />
          {cambio && (
            <button type="submit" className="btn adm-galeria__guardar" disabled={guardando}>
              {guardando ? "…" : "Guardar"}
            </button>
          )}
        </form>
        {error && <p className="campo__error">{error}</p>}
        <div className="adm-galeria__acciones">
          <button
            type="button"
            className="adm-galeria__mover"
            onClick={() => onMover(posicion, posicion - 1)}
            disabled={posicion === 0}
            aria-label={`Mover ${foto.titulo || "esta foto"} antes`}
          >
            ←
          </button>
          <button
            type="button"
            className="adm-galeria__mover"
            onClick={() => onMover(posicion, posicion + 1)}
            disabled={posicion === total - 1}
            aria-label={`Mover ${foto.titulo || "esta foto"} después`}
          >
            →
          </button>
          <span className="adm-suave">{fecha(foto.creado_en).split(",")[0]}</span>
          <button type="button" className="adm-link" onClick={() => onBorrar(foto)}>
            Sacar
          </button>
        </div>
      </div>
    </li>
  );
};

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

  // Mueve una foto y guarda el orden completo. La lista cambia al instante;
  // si el servidor no lo acepta, se vuelve a cargar como estaba.
  const mover = async (desde: number, hacia: number) => {
    if (!fotos || hacia < 0 || hacia >= fotos.length) return;
    const nuevas = [...fotos];
    const [movida] = nuevas.splice(desde, 1);
    nuevas.splice(hacia, 0, movida!);
    setFotos(nuevas);
    setError(null);
    setAviso(null);
    try {
      setFotos(await api<FotoGaleria[]>("/api/galeria/orden", { method: "PUT", body: { ids: nuevas.map((f) => f.id) } }));
    } catch (err) {
      setError(mensajeDe(err));
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
        Las fotos de los trabajos terminados, en el orden en que aparecen en el carrusel del inicio. Las que
        subas van primeras; con las flechas las podés mover, y el título se cambia escribiendo ahí mismo.
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
          {fotos.map((f, i) => (
            <ItemGaleria
              key={f.id}
              foto={f}
              posicion={i}
              total={fotos.length}
              onMover={mover}
              onBorrar={borrar}
              onGuardada={(nueva) => setFotos((lista) => lista?.map((x) => (x.id === nueva.id ? nueva : x)) ?? null)}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

export default PanelGaleria;
