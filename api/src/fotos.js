// Fotos que mandan los clientes.
//
// El navegador las manda como data URL ("data:image/jpeg;base64,...") dentro
// del pedido o del presupuesto. Aca se validan, se guardan en la tabla
// `fotos` y se reemplazan por una direccion publica (/api/fotos/<id>).
//
// Se guardan en la base para arrancar sin otro servicio. Si con el tiempo
// pesan demasiado, este es el unico archivo que hay que cambiar para
// mandarlas a Cloudinary o a un bucket.

import crypto from "node:crypto";
import { API_URL, FOTO_MAX_BYTES } from "./config.js";

const TIPOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const PATRON = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/;

// Firma de los primeros bytes de cada formato: que el archivo diga ser
// una imagen no alcanza, tiene que serlo.
function esImagenReal(mime, buf) {
  if (mime === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8;
  if (mime === "image/png") return buf.subarray(0, 4).toString("hex") === "89504e47";
  if (mime === "image/webp") return buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";
  return false;
}

function error(mensaje) {
  const err = new Error(mensaje);
  err.status = 400;
  return err;
}

export const esDataUrl = (v) => typeof v === "string" && v.startsWith("data:");

// Guarda una foto y devuelve su direccion publica.
// `client` es la conexion de la transaccion, para que si el pedido falla
// tampoco quede la foto guardada.
export async function guardarFoto(client, dataUrl) {
  const m = PATRON.exec(dataUrl || "");
  if (!m || !TIPOS.has(m[1])) throw error("La foto tiene que ser JPG, PNG o WEBP.");

  const datos = Buffer.from(m[2], "base64");
  if (datos.length > FOTO_MAX_BYTES) throw error("La foto es demasiado pesada.");
  if (!esImagenReal(m[1], datos)) throw error("El archivo de la foto no es una imagen valida.");

  const id = crypto.randomBytes(16).toString("hex");
  await client.query(
    `INSERT INTO fotos (id, mime, datos, bytes) VALUES ($1, $2, $3, $4)`,
    [id, m[1], datos, datos.length]
  );
  return `${API_URL}/api/fotos/${id}`;
}
