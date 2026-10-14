import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || "https://yosiart.onrender.com";
const CLAVE = "yosiart_sesion";

export const AuthProvider = ({ children }) => {
  const [sesion, setSesion] = useState(() => {
    try {
      const guardado = localStorage.getItem(CLAVE);
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });

  // Estado del modal: null = cerrado, "login" o "registro" = abierto en ese paso
  const [modal, setModal] = useState(null);

  // El servidor concede el descuento si descuento_usado es falso Y ademas
  // no hay un pedido vivo que ya lo haya consumido. La bandera de la tabla
  // usuarios recien se marca al confirmar el pedido, asi que mirarla sola
  // deja el cartel del 20% visible despues de comprar.
  const [pedidoConDescuento, setPedidoConDescuento] = useState(false);

  const token = sesion?.token ?? null;

  useEffect(() => {
    try {
      if (sesion) localStorage.setItem(CLAVE, JSON.stringify(sesion));
      else localStorage.removeItem(CLAVE);
    } catch {
      // Modo incognito: la sesion vive en memoria y se pierde al recargar.
    }
  }, [sesion]);

  const revisarDescuento = useCallback(async () => {
    if (!token) {
      setPedidoConDescuento(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/pedidos/mis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const pedidos = await res.json();
      setPedidoConDescuento(
        pedidos.some((p) => Number(p.descuento) > 0 && p.estado !== "cancelado")
      );
    } catch {
      // Sin conexion dejamos la bandera como esta.
    }
  }, [token]);

  // Vuelve a pedir el usuario al servidor. Se usa despues de comprar,
  // para que el cartel del 20% desaparezca sin recargar la pagina.
  const refrescarUsuario = useCallback(async () => {
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setSesion(null);
        return null;
      }
      if (!res.ok) return null;
      const data = await res.json();
      setSesion((s) => (s ? { ...s, usuario: data.usuario } : s));
      revisarDescuento();
      return data.usuario;
    } catch {
      return null;
    }
  }, [token, revisarDescuento]);

  // Al cargar la pagina revalidamos contra el servidor: un token vencido
  // tiene que caducar solo, en vez de dejar la interfaz mostrando una
  // sesion que ya no existe.
  useEffect(() => {
    if (!token) return;
    refrescarUsuario();
    // Solo al montar o al cambiar el token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const pedir = async (ruta, cuerpo) => {
    const res = await fetch(`${API_URL}${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detalle = data.detalles?.[0]?.mensaje;
      throw new Error(detalle || data.error || "Algo salio mal. Proba de nuevo.");
    }
    return data;
  };

  const login = async (email, password) => {
    const data = await pedir("/api/auth/login", { email, password });
    setSesion({ token: data.token, usuario: data.usuario });
    setModal(null);
    return data.usuario;
  };

  const registro = async (datos) => {
    const data = await pedir("/api/auth/registro", datos);
    setSesion({ token: data.token, usuario: data.usuario });
    setModal(null);
    return data.usuario;
  };

  const logout = () => {
    setSesion(null);
    setPedidoConDescuento(false);
  };

  const usuario = sesion?.usuario ?? null;

  return (
    <AuthContext.Provider
      value={{
        token,
        usuario,
        logueado: !!token,
        // La misma regla que aplica el servidor al crear el pedido
        tieneDescuento:
          !!usuario && !usuario.descuento_usado && !pedidoConDescuento,
        login,
        registro,
        logout,
        refrescarUsuario,
        revisarDescuento,
        modal,
        abrirModal: (m = "registro") => setModal(m),
        cerrarModal: () => setModal(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth necesita estar dentro de <AuthProvider>");
  return ctx;
};
