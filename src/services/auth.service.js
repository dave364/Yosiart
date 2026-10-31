// Cuentas: /api/auth
import { pedirApi } from "./api";

export const iniciarSesion = (email, password) => pedirApi("/api/auth/login", { method: "POST", body: { email, password } });

export const registrarse = (datos) => pedirApi("/api/auth/registro", { method: "POST", body: datos });

export const usuarioActual = (token) => pedirApi("/api/auth/me", { token });

export const pedirCambioDePassword = (email) =>
  pedirApi("/api/auth/recuperar", { method: "POST", body: { email }, porDefecto: "No pudimos procesar el pedido." });

export const cambiarPassword = (token, password) =>
  pedirApi("/api/auth/restablecer", {
    method: "POST",
    body: { token, password },
    porDefecto: "No pudimos cambiar la contrasena.",
  });
