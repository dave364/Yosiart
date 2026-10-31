// Datos que llegan a /api/pedidos.
import { z } from "zod";
import { emailCampo, nombreCampo } from "./campos.ts";
import { telefonoValido, normalizarTelefono } from "../lib/telefono.ts";
import { COLORES, GLITTERS, LETRAS, MAX_NOMBRE, ESTADOS_PEDIDO, ids } from "../constantes/catalogo.ts";

const telefonoCliente = z
  .string()
  .trim()
  .refine(telefonoValido, "El teléfono tiene que tener 10 dígitos, con el código de área")
  .transform(normalizarTelefono);

// Lo que el cliente eligio para cada pieza. Los campos que no estan aca
// (por ejemplo tamanoCm) se descartan: la medida la pone el servidor.
const personalizacionSchema = z.object({
  forma: z.string().trim().max(30).nullish(),
  tamano: z.string().trim().max(30).nullish(),
  color: z.enum(ids(COLORES)),
  glitter: z.enum(ids(GLITTERS)).default("sin"),
  nombre: z.string().trim().max(MAX_NOMBRE).default(""),
  // null llega en piezas sin nada escrito; sin dato (carritos viejos) va plateada.
  letra: z.enum(ids(LETRAS)).nullish(),
  telefono: z.string().trim().max(20).nullish(),
  telefonoLado: z.enum(["frente", "dorso"]).nullish(),
  foto: z.string().max(3_000_000).nullish(),
});

// El cliente manda QUE pieza quiere, CUANTAS y COMO personalizada,
// nunca a que precio. El precio lo decide el servidor.
export const pedidoSchema = z.object({
  cliente_nombre: nombreCampo,
  cliente_email: emailCampo,
  cliente_telefono: telefonoCliente,
  items: z
    .array(
      z.object({
        pieza_id: z.string().trim().min(1).max(60),
        cantidad: z.coerce.number().int().min(1).max(50),
        personalizacion: personalizacionSchema,
      })
    )
    .min(1)
    .max(30),
});

export const estadoSchema = z.object({
  estado: z.enum(ids(ESTADOS_PEDIDO)),
  nota: z.string().trim().max(500).optional(),
});

export const totalSchema = z.object({ total: z.coerce.number().nonnegative() });

// Seguimiento sin cuenta: hace falta el numero Y el email del pedido,
// asi nadie puede mirar pedidos ajenos probando numeros.
export const seguimientoSchema = z.object({
  numero: z.string().trim().regex(/^\d{1,10}$/).transform((n) => n.padStart(4, "0")),
  email: emailCampo,
});

export type DatosPedido = z.infer<typeof pedidoSchema>;
export type PersonalizacionPedida = z.infer<typeof personalizacionSchema>;
export type DatosEstado = z.infer<typeof estadoSchema>;
export type DatosSeguimiento = z.infer<typeof seguimientoSchema>;
