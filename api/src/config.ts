// Las variables llegan de distinto lado segun donde corre la API:
// - En tu PC (npm run dev): del archivo api/.env, que carga src/index.ts.
// - En Cloudflare: de las variables y secretos del worker.
export const PORT = process.env.PORT || 3000;

const secreto = process.env.JWT_SECRET;
if (!secreto || secreto.length < 32) {
  console.error(
    "JWT_SECRET falta o es demasiado corto (minimo 32 caracteres).\n" +
    "Genera uno con: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
  );
  throw new Error("Falta JWT_SECRET");
}
export const JWT_SECRET: string = secreto;

export const JWT_EXPIRES_IN = "7d";

// Origenes permitidos para CORS, separados por coma
export const ORIGENES = (process.env.ORIGENES_PERMITIDOS ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Direccion publica de la tienda (enlaces de los correos) y de esta API
// (las fotos de los clientes se sirven desde aca).
export const SITIO_URL = (process.env.SITIO_URL || "http://localhost:5173").replace(/\/$/, "");
export const API_URL = (process.env.API_URL || SITIO_URL).replace(/\/$/, "");

// --- Correo (Brevo) ---
// Si falta la clave, el sistema sigue funcionando y solo avisa en el log:
// un registro o un pedido nunca debe fallar porque el correo no este listo.
export const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
// Solo para las pruebas automaticas, que levantan un Brevo falso local.
export const BREVO_API_URL = process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email";
export const MAIL_FROM_EMAIL = process.env.MAIL_FROM_EMAIL || "";
export const MAIL_FROM_NOMBRE = process.env.MAIL_FROM_NOMBRE || "YosiArt";

// A donde llega el aviso de cada pedido o presupuesto nuevo. Si no se
// configura, usa la misma casilla que manda los correos.
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.MAIL_FROM_EMAIL || "";

// Fotos que suben los clientes (dentro del pedido o del presupuesto).
export const FOTO_MAX_BYTES = 1.5 * 1024 * 1024;
