import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { iniciarSesion, registrarse, usuarioActual } from "../services/auth.service";

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
      const data = await usuarioActual(token);
      setSesion((s) => (s ? { ...s, usuario: data.usuario } : s));
      return data.usuario;
    } catch (err) {
      // 401: token vencido. 404: cuenta suspendida o borrada.
      if (err.status === 401 || err.status === 404) setSesion(null);
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

  const login = async (email, password) => {
    const data = await iniciarSesion(email, password);
    setSesion({ token: data.token, usuario: data.usuario });
    setModal(null);
    return data.usuario;
  };

  const registro = async (datos) => {
    const data = await registrarse(datos);
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
