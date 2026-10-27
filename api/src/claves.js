// Contraseñas de los clientes.
//
// Se guardan con PBKDF2 (SHA-256) usando el crypto del propio entorno.
// Antes se usaba bcrypt, pero bcrypt hecho en JavaScript tarda demasiado
// para el plan gratis de Cloudflare Workers (10 ms de CPU por pedido).
//
// Vueltas: 25.000, unos 5 ms, para que el login entre con margen en esos
// 10 ms. Para compensar, las contraseñas nuevas piden al menos 10
// caracteres (validacion.js). Si se pasa al plan pago de Workers (30 s de
// CPU), conviene subir VUELTAS a 100.000, el máximo que permite
// Cloudflare: las cuentas se actualizan solas en su próximo login.
//
// Formato guardado: pbkdf2$<vueltas>$<sal en base64>$<hash en base64>
//
// Las cuentas creadas antes de este cambio siguen teniendo un hash de
// bcrypt ($2a$/$2b$...). Se aceptan una vez y, si la contraseña es
// correcta, se vuelven a guardar en el formato nuevo.

import bcrypt from "bcryptjs";

const VUELTAS = 25_000;
const enc = new TextEncoder();

const aBase64 = (bytes) => Buffer.from(bytes).toString("base64");
const deBase64 = (txt) => new Uint8Array(Buffer.from(txt, "base64"));

async function derivar(password, sal, vueltas) {
  const clave = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: vueltas },
    clave,
    256
  );
  return new Uint8Array(bits);
}

// Compara sin cortar en la primera diferencia, para no revelar nada por el tiempo.
function iguales(a, b) {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a[i] ^ b[i];
  return dif === 0;
}

export async function hashPassword(password) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivar(password, sal, VUELTAS);
  return `pbkdf2$${VUELTAS}$${aBase64(sal)}$${aBase64(hash)}`;
}

// Hash de relleno para cuando el email no existe: se hace el mismo trabajo
// que con una cuenta real, así el tiempo no revela qué emails están registrados.
const RELLENO = `pbkdf2$${VUELTAS}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;

// Devuelve { ok, rehacer }. `rehacer` avisa que el hash es del formato
// viejo y conviene guardarlo de nuevo con hashPassword.
export async function verificarPassword(password, guardado) {
  const h = guardado || RELLENO;

  if (h.startsWith("$2")) {
    const ok = await bcrypt.compare(password, h);
    return { ok, rehacer: ok };
  }

  const [tipo, vueltas, sal, hash] = h.split("$");
  if (tipo !== "pbkdf2" || !vueltas || !sal || !hash) return { ok: false, rehacer: false };
  const calculado = await derivar(password, deBase64(sal), Number(vueltas));
  const ok = iguales(calculado, deBase64(hash)) && Boolean(guardado);
  return { ok, rehacer: ok && Number(vueltas) !== VUELTAS };
}
