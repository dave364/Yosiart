// Fotos que mandan los clientes.
//
// El navegador las manda como data URL ("data:image/jpeg;base64,...") dentro
// del pedido o del presupuesto. Aca se validan, se guardan en la tabla
// `fotos` y se reemplazan por una direccion publica (/api/fotos/<id>).
//
// Se guardan en la base para arrancar sin otro servicio. Si con el tiempo
// pesan demasiado, se cambia repositories/fotos.repository.js para
// mandarlas a Cloudinary o a un bucket.

import crypto from "node:crypto";
import { FOTO_MAX_BYTES } from "../config.ts";
import { datoInvalido } from "../lib/errores.ts";
import * as fotosRepo from "../repositories/fotos.repository.ts";
import type { Conexion } from "../tipos.ts";

const TIPOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const PATRON = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/;

// Firma de los primeros bytes de cada formato: que el archivo diga ser
// una imagen no alcanza, tiene que serlo.
function esImagenReal(mime: string, buf: Buffer): boolean {
  if (mime === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8;
  if (mime === "image/png") return buf.subarray(0, 4).toString("hex") === "89504e47";
  if (mime === "image/webp") return buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";
  return false;
}

export const esDataUrl = (v: unknown): v is string => typeof v === "string" && v.startsWith("data:");

// Guarda una foto y devuelve su direccion (/api/fotos/<id>).
// Se guarda sin el dominio: la tienda y la API comparten direccion, asi
// que la foto se sigue viendo aunque mañana cambie el dominio. Los correos
// le agregan el dominio con fotoAbsoluta (mail.service.js).
// `conexion` es la de la transaccion, para que si el pedido falla
// tampoco quede la foto guardada.
export async function guardarFoto(conexion: Conexion, dataUrl: string): Promise<string> {
  const m = PATRON.exec(dataUrl || "");
  if (!m || !TIPOS.has(m[1])) throw datoInvalido("La foto tiene que ser JPG, PNG o WEBP.");

  const datos = Buffer.from(m[2], "base64");
  if (datos.length > FOTO_MAX_BYTES) throw datoInvalido("La foto es demasiado pesada.");
  if (!esImagenReal(m[1], datos)) throw datoInvalido("El archivo de la foto no es una imagen valida.");

  const id = crypto.randomBytes(16).toString("hex");
  await fotosRepo.crear({ id, mime: m[1], datos }, conexion);
  return `/api/fotos/${id}`;
}

// Para servirla: solo ids con el formato correcto (32 caracteres hex).
export async function buscarFoto(id: string) {
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  return fotosRepo.buscar(id);
}
