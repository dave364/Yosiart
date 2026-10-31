import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { precioDe } from "../data/piezas";
import type { ItemCarrito, Opciones, Pieza } from "../tipos";

interface ValorCarrito {
  items: ItemCarrito[];
  agregar: (pieza: Pieza, opciones: Opciones, cantidad?: number) => void;
  cambiarCantidad: (clave: string, cantidad: number) => void;
  quitar: (clave: string) => void;
  vaciar: () => void;
  unidades: number;
  subtotal: number | null;
}

const CartContext = createContext<ValorCarrito | null>(null);

const CLAVE = "yosiart_carrito";

// En YosiArt cada pieza es unica: la misma chapita con "Luna" y con "Toby"
// son dos items distintos. Por eso cada item se identifica por una clave
// armada con la pieza + todas sus opciones, no solo por el id del producto.
const claveDe = (piezaId: string, opciones: Opciones) =>
  [
    piezaId,
    opciones.forma || "",
    opciones.tamano || "",
    opciones.color,
    opciones.glitter,
    (opciones.nombre || "").trim().toLowerCase(),
    opciones.letra || "",
    (opciones.telefono || "").trim(),
    opciones.telefonoLado || "",
    opciones.foto ? opciones.foto.slice(-40) : "",
  ].join("|");

export const CartProvider = ({ children }: { children: ReactNode }) => {
  // El carrito sobrevive a un refresh. El precio siempre lo decide el
  // servidor al confirmar, asi que editar esto a mano no cambia lo que se paga.
  const [items, setItems] = useState<ItemCarrito[]>(() => {
    try {
      const guardado = localStorage.getItem(CLAVE);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {
      // Incognito o storage lleno (por ejemplo, muchas fotos): el carrito
      // sigue funcionando en memoria, solo que no persiste.
    }
  }, [items]);

  // opciones: lo que eligió el cliente (foto = miniatura en dataURL)
  const agregar = (pieza: Pieza, opciones: Opciones, cantidad = 1) => {
    const clave = claveDe(pieza.id, opciones);
    setItems((actuales) => {
      const existente = actuales.find((i) => i.clave === clave);
      if (existente) {
        return actuales.map((i) =>
          i.clave === clave ? { ...i, cantidad: Math.min(i.cantidad + cantidad, 50) } : i
        );
      }
      return [
        ...actuales,
        {
          clave,
          piezaId: pieza.id,
          nombrePieza: pieza.nombre,
          forma: opciones.forma || pieza.forma,
          // Precio de referencia para mostrar; el que se cobra lo calcula la API.
          precio: precioDe(pieza, opciones.forma || pieza.forma, opciones.tamano),
          opciones,
          cantidad,
        },
      ];
    });
  };

  const cambiarCantidad = (clave: string, cantidad: number) => {
    setItems((actuales) =>
      actuales
        .map((i) => (i.clave === clave ? { ...i, cantidad: Math.max(0, Math.min(cantidad, 50)) } : i))
        .filter((i) => i.cantidad > 0)
    );
  };

  const quitar = (clave: string) => setItems((actuales) => actuales.filter((i) => i.clave !== clave));

  const vaciar = () => setItems([]);

  const unidades = items.reduce((n, i) => n + i.cantidad, 0);
  // Si alguna pieza no tiene precio cargado, el total queda "a confirmar".
  const subtotal = items.some((i) => i.precio == null)
    ? null
    : items.reduce((n, i) => n + (i.precio ?? 0) * i.cantidad, 0);

  return (
    <CartContext.Provider
      value={{ items, agregar, cambiarCantidad, quitar, vaciar, unidades, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart necesita estar dentro de <CartProvider>");
  return ctx;
};
