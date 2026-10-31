import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { Pieza, ProductoApi } from "../tipos";
import { listarProductos } from "../services/productos.service";
import { PIEZAS, muestraDe } from "../data/piezas";

interface ValorCatalogo {
  piezas: Pieza[];
  desdeServidor: boolean;
  recargar: () => Promise<void>;
}

const CatalogoContext = createContext<ValorCatalogo | null>(null);

// La API guarda las piezas con nombres de columna de la base; la tienda
// las usa con los mismos campos que data/piezas.ts.
const desdeApi = (p: ProductoApi): Pieza => ({
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

export const CatalogoProvider = ({ children }: { children: ReactNode }) => {
  // Arranca con el catálogo local para que la página nunca se vea vacía;
  // en cuanto responde la API, se reemplaza por el real (con los precios).
  const [piezas, setPiezas] = useState(PIEZAS);
  const [desdeServidor, setDesdeServidor] = useState(false);

  const recargar = useCallback(async () => {
    try {
      const datos = await listarProductos();
      if (Array.isArray(datos) && datos.length) {
        setPiezas(datos.map(desdeApi));
        setDesdeServidor(true);
      }
    } catch {
      // Sin conexión o con la API caída: queda el catálogo local.
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
