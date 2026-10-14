import { useCallback } from "react";
import { API_URL } from "../../config";
import { useAuth } from "../../context/AuthContext";

// Llamadas del panel a la API, siempre con el token del admin.
// Si el token vence (401), cierra la sesión para que vuelva a entrar.
export function useAdminApi() {
  const { token, logout } = useAuth();

  return useCallback(
    async (ruta, { method = "GET", body } = {}) => {
      const res = await fetch(`${API_URL}${ruta}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (res.status === 401) {
        logout();
        throw new Error("Tu sesión venció. Volvé a entrar.");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detalles?.[0]?.mensaje || data.error || `Error ${res.status}`);
      return data;
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
