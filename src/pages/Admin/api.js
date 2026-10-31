import { useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { pedirApi } from "../../services/api";

// Llamadas del panel a la API, siempre con el token del admin.
// Si el token vence (401), cierra la sesión para que vuelva a entrar.
export function useAdminApi() {
  const { token, logout } = useAuth();

  return useCallback(
    async (ruta, { method = "GET", body } = {}) => {
      try {
        return await pedirApi(ruta, { method, body, token });
      } catch (err) {
        if (err.status === 401) {
          logout();
          throw new Error("Tu sesión venció. Volvé a entrar.");
        }
        throw err;
      }
    },
    [token, logout]
  );
}

export const fecha = (iso) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// Teléfono guardado como 5491112345678 → "11 1234-5678" para leerlo fácil.
export const telefonoLindo = (t) => {
  const d = String(t || "").replace(/^549/, "");
  return d.length === 10 ? `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}` : t || "";
};
