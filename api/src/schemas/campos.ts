// Campos que se repiten en varias rutas, con mensajes en español que
// el cliente puede leer tal cual (la tienda muestra el primer mensaje).
import { z } from "zod";

// Para todo lo que no tenga un mensaje propio, Zod responde en español.
z.config(z.locales.es());

export const emailCampo = z
  .string()
  .trim()
  .toLowerCase()
  .email("Revisá el email: tiene que ser como nombre@ejemplo.com");

export const nombreCampo = z
  .string()
  .trim()
  .min(2, "Escribí tu nombre y apellido.")
  .max(80, "El nombre es demasiado largo.");

export const passwordCampo = z
  .string()
  .min(10, "La contraseña tiene que tener al menos 10 caracteres.")
  .max(200, "La contraseña es demasiado larga.");
