import { useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { pedirApi, ErrorApi } from "../../services/api";
import type { OpcionesPedido } from "../../services/api";

// Una llamada del panel: como pedirApi, pero el token lo pone sola.
export type LlamadaAdmin = <T = unknown>(ruta: string, opciones?: Pick<OpcionesPedido, "method" | "body">) => Promise<T>;

// Llamadas del panel a la API, siempre con el token del admin.
// Si el token vence (401), cierra la sesión para que vuelva a entrar.
export function useAdminApi(): LlamadaAdmin {
  const { token, logout } = useAuth();

  return useCallback(
    async <T,>(ruta: string, { method = "GET", body }: Pick<OpcionesPedido, "method" | "body"> = {}) => {
      try {
        return await pedirApi<T>(ruta, { method, body, token });
      } catch (err) {
        if (err instanceof ErrorApi && err.status === 401) {
          logout();
          throw new Error("Tu sesión venció. Volvé a entrar.");
        }
        throw err;
      }
    },
    [token, logout]
  );
}

export const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// Teléfono guardado como 5491112345678 → "11 1234-5678" para leerlo fácil.
export const telefonoLindo = (t: string | null | undefined) => {
  const d = String(t || "").replace(/^549/, "");
  return d.length === 10 ? `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}` : t || "";
};
