// Datos que llegan a /api/presupuestos.
import { z } from "zod";
import { emailCampo, nombreCampo } from "./campos.js";
import { telefonoValido, normalizarTelefono } from "../lib/telefono.js";

export const TIPOS = ["Souvenirs para un evento", "Pieza única a medida", "Regalo personalizado", "Otro"];
export const MAX_FOTOS = 3;

// "" llega de los campos opcionales que el cliente dejo vacios.
const vacioANull = (v) => (v === "" || v === undefined ? null : v);

export const presupuestoSchema = z.object({
  nombre: nombreCampo,
  email: emailCampo,
  telefono: z.preprocess(
    vacioANull,
    z.string().trim().refine(telefonoValido, "El teléfono tiene que tener 10 dígitos, con el código de área")
      .transform(normalizarTelefono).nullable()
  ),
  tipo: z.enum(TIPOS),
  cantidad: z.preprocess(vacioANull, z.coerce.number().int().min(1).max(5000).nullable()),
  fecha: z.preprocess(vacioANull, z.iso.date().nullable()),
  descripcion: z.string().trim().min(10).max(2000),
  fotos: z.array(z.string().max(3_000_000)).max(MAX_FOTOS).default([]),
});

export const respuestaSchema = z.object({
  estado: z.enum(["nuevo", "respondido", "aceptado", "rechazado"]),
  respuesta: z.string().trim().max(2000).optional(),
  precio: z.coerce.number().nonnegative().nullable().optional(),
});
