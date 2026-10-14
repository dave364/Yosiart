import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { API_URL } from "../config";
import { PIEZAS, muestraDe } from "../data/piezas";

const CatalogoContext = createContext(null);

// La API guarda las piezas con nombres de columna de la base; la tienda
// las usa con los mismos campos que data/piezas.js.
const desdeApi = (p) => ({
  id: p.slug,
  dbId: p.id,
  nombre: p.nombre,
  descripcion: p.descripcion,
  categoria: p.categoria,
  forma: p.forma,
  formas: p.formas?.length ? p.formas : undefined,
  tamanos: p.tamanos || {},
  lleva: p.lleva || { nombre: true },
  precio: p.precio,
  preciosTamano: p.precios_tamano || {},
  nuevo: p.nuevo,
  muestra: muestraDe(p.slug),
});

export const CatalogoProvider = ({ children }) => {
  // Arranca con el catálogo local para que la página nunca se vea vacía;
  // en cuanto responde la API, se reemplaza por el real (con los precios).
  const [piezas, setPiezas] = useState(PIEZAS);
  const [desdeServidor, setDesdeServidor] = useState(false);

  const recargar = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/productos`);
      if (!res.ok) return;
      const datos = await res.json();
      if (Array.isArray(datos) && datos.length) {
        setPiezas(datos.map(desdeApi));
        setDesdeServidor(true);
      }
    } catch {
      // Sin conexión (o la API dormida en Render): queda el catálogo local.
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return (
    <CatalogoContext.Provider value={{ piezas, desdeServidor, recargar }}>
      {children}
    </CatalogoContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCatalogo = () => {
  const ctx = useContext(CatalogoContext);
  if (!ctx) throw new Error("useCatalogo necesita estar dentro de <CatalogoProvider>");
  return ctx;
};
