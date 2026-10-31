// Datos que llegan a /api/auth.
import { z } from "zod";
import { emailCampo, nombreCampo, passwordCampo } from "./campos.js";
import { telefonoValido, normalizarTelefono } from "../lib/telefono.js";

export const registroSchema = z.object({
  nombre: nombreCampo,
  email: emailCampo,
  // Telefono argentino: lo aceptamos como lo escriba la persona y lo
  // guardamos normalizado. El numero local argentino tiene 10 digitos.
  telefono: z
    .string()
    .trim()
    .refine(telefonoValido, "El teléfono tiene que tener 10 dígitos, con el código de área")
    .transform(normalizarTelefono),
  password: passwordCampo,
});

export const loginSchema = z.object({
  email: emailCampo,
  password: z.string().min(1),
});

export const recuperarSchema = z.object({
  email: emailCampo,
});

export const restablecerSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: passwordCampo,
});
