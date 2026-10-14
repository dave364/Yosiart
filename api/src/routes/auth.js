import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { telefonoValido, normalizarTelefono } from "../telefono.js";
import { z } from "zod";
import { emailCampo, nombreCampo, passwordCampo } from "../validacion.js";
import { query } from "../db.js";
import { JWT_SECRET, JWT_EXPIRES_IN, SITIO_URL } from "../config.js";
import { requiereAuth } from "../middleware/auth.js";
import { mailBienvenida, mailReset, enviarEnSegundoPlano } from "../mail.js";

export const router = Router();

const registroSchema = z.object({
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

const loginSchema = z.object({
  email: emailCampo,
  password: z.string().min(1),
});

function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function publico(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    telefono: usuario.telefono,
    rol: usuario.rol,
  };
}

router.post("/registro", async (req, res, next) => {
  try {
    const datos = registroSchema.parse(req.body);
    const hash = await bcrypt.hash(datos.password, 12);

    const { rows } = await query(
      `INSERT INTO usuarios (nombre, email, telefono, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, telefono, rol`,
      [datos.nombre, datos.email, datos.telefono, hash]
    );

    const usuario = rows[0];
    // El correo se manda sin esperar respuesta: si Brevo tarda o falla,
    // la cuenta ya quedo creada y el cliente entra igual.
    enviarEnSegundoPlano(usuario.email, usuario.nombre, mailBienvenida(usuario));

    res.status(201).json({ token: firmarToken(usuario), usuario: publico(usuario) });
  } catch (err) {
    // 23505 = violacion de UNIQUE (el email)
    if (err.code === "23505") {
      return res.status(409).json({ error: "Ese email ya esta registrado." });
    }
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const datos = loginSchema.parse(req.body);
    const { rows } = await query(
      `SELECT id, nombre, email, telefono, rol, password_hash, activo
         FROM usuarios WHERE email = $1`,
      [datos.email]
    );

    const usuario = rows[0];
    // Se compara igual aunque el usuario no exista, para no revelar
    // por diferencia de tiempo si el email esta registrado.
    const hash = usuario?.password_hash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
    const ok = await bcrypt.compare(datos.password, hash);
    if (!usuario || !ok) {
      return res.status(401).json({ error: "Email o contrasena incorrectos." });
    }

    // Se revisa despues de la contrasena a proposito: si avisaramos
    // antes, cualquiera podria averiguar que cuentas existen probando
    // direcciones y leyendo cual responde "suspendida".
    if (!usuario.activo) {
      const err = new Error("Tu cuenta esta suspendida. Escribinos a nuestro correo.");
      err.status = 403;
      throw err;
    }

    res.json({ token: firmarToken(usuario), usuario: publico(usuario) });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requiereAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, nombre, email, telefono, rol
         FROM usuarios WHERE id = $1 AND activo = TRUE`,
      [req.usuario.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Usuario no encontrado." });
    res.json({ usuario: publico(rows[0]) });
  } catch (err) {
    next(err);
  }
});

const recuperarSchema = z.object({
  email: emailCampo,
});

const restablecerSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: passwordCampo,
});

// Paso 1: el cliente pide el enlace.
router.post("/recuperar", async (req, res, next) => {
  try {
    const { email } = recuperarSchema.parse(req.body);

    const { rows } = await query(
      `SELECT id, nombre, email FROM usuarios WHERE email = $1`,
      [email]
    );
    const usuario = rows[0];

    if (usuario) {
      // El token viaja en el correo; en la base guardamos solo su hash.
      const token = crypto.randomBytes(32).toString("hex");
      const hash = crypto.createHash("sha256").update(token).digest("hex");

      await query(
        `INSERT INTO reset_tokens (usuario_id, token_hash, expira_en)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [usuario.id, hash]
      );

      enviarEnSegundoPlano(
        usuario.email,
        usuario.nombre,
        mailReset(usuario, SITIO_URL + "/#reset=" + token)
      );
    }

    // Respondemos igual exista o no la cuenta. Si dijeramos "ese email no
    // esta registrado", cualquiera podria averiguar quienes son clientes
    // probando direcciones de a una.
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Paso 2: el cliente abre el enlace y elige la contrasena nueva.
router.post("/restablecer", async (req, res, next) => {
  try {
    const { token, password } = restablecerSchema.parse(req.body);
    const hash = crypto.createHash("sha256").update(token).digest("hex");

    const { rows } = await query(
      `SELECT id, usuario_id FROM reset_tokens
        WHERE token_hash = $1 AND usado_en IS NULL AND expira_en > NOW()`,
      [hash]
    );
    const pedido = rows[0];

    if (!pedido) {
      const err = new Error("El enlace vencio o ya fue usado. Pedi uno nuevo.");
      err.status = 400;
      throw err;
    }

    const password_hash = await bcrypt.hash(password, 10);
    await query(`UPDATE usuarios SET password_hash = $1 WHERE id = $2`, [
      password_hash,
      pedido.usuario_id,
    ]);

    // Quemamos este pedido y cualquier otro que siguiera abierto:
    // si pidio el enlace tres veces, los tres dejan de servir.
    await query(
      `UPDATE reset_tokens SET usado_en = NOW()
        WHERE usuario_id = $1 AND usado_en IS NULL`,
      [pedido.usuario_id]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
