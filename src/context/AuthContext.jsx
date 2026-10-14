import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_URL } from "../config";

const AuthContext = createContext(null);

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

  const token = sesion?.token ?? null;

  useEffect(() => {
    try {
      if (sesion) localStorage.setItem(CLAVE, JSON.stringify(sesion));
      else localStorage.removeItem(CLAVE);
    } catch {
      // Modo incognito: la sesion vive en memoria y se pierde al recargar.
    }
  }, [sesion]);

  // Vuelve a pedir el usuario al servidor.
  const refrescarUsuario = useCallback(async () => {
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // 401: token vencido. 404: cuenta suspendida o borrada.
      if (res.status === 401 || res.status === 404) {
        setSesion(null);
        return null;
      }
      if (!res.ok) return null;
      const data = await res.json();
      setSesion((s) => (s ? { ...s, usuario: data.usuario } : s));
      return data.usuario;
    } catch {
      return null;
    }
  }, [token]);

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

  const logout = useCallback(() => setSesion(null), []);

  const usuario = sesion?.usuario ?? null;

  return (
    <AuthContext.Provider
      value={{
        token,
        usuario,
        logueado: !!token,
        esAdmin: usuario?.rol === "admin",
        login,
        registro,
        logout,
        refrescarUsuario,
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
