// Cuentas: /api/auth
import { pedirApi } from "./api";
import type { Usuario } from "../tipos";

export interface Sesion {
  token: string;
  usuario: Usuario;
}

export interface DatosRegistro {
  nombre: string;
  email: string;
  telefono: string;
  password: string;
}

export const iniciarSesion = (email: string, password: string) =>
  pedirApi<Sesion>("/api/auth/login", { method: "POST", body: { email, password } });

export const registrarse = (datos: DatosRegistro) => pedirApi<Sesion>("/api/auth/registro", { method: "POST", body: datos });

export const usuarioActual = (token: string) => pedirApi<{ usuario: Usuario }>("/api/auth/me", { token });

export const pedirCambioDePassword = (email: string) =>
  pedirApi<{ ok: true }>("/api/auth/recuperar", { method: "POST", body: { email }, porDefecto: "No pudimos procesar el pedido." });

export const cambiarPassword = (token: string, password: string) =>
  pedirApi<{ ok: true }>("/api/auth/restablecer", {
    method: "POST",
    body: { token, password },
    porDefecto: "No pudimos cambiar la contrasena.",
  });
