// Tabla reset_tokens: enlaces para cambiar la contraseña. Se guarda solo
// el hash del token; el token en sí viaja únicamente en el correo.
import { db } from "../db.js";

export async function crear(usuarioId, tokenHash) {
  await db.query(
    `INSERT INTO reset_tokens (usuario_id, token_hash, expira_en)
     VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
    [usuarioId, tokenHash]
  );
}

export async function buscarVigente(tokenHash) {
  const { rows } = await db.query(
    `SELECT id, usuario_id FROM reset_tokens
      WHERE token_hash = $1 AND usado_en IS NULL AND expira_en > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
}

// Quema todos los enlaces abiertos del usuario: si pidió tres, los tres dejan de servir.
export async function marcarUsados(usuarioId) {
  await db.query(
    `UPDATE reset_tokens SET usado_en = NOW()
      WHERE usuario_id = $1 AND usado_en IS NULL`,
    [usuarioId]
  );
}
