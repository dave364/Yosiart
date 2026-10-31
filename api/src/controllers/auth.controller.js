// /api/auth: lee el pedido, valida los datos y responde.
import * as authService from "../services/auth.service.js";
import { registroSchema, loginSchema, recuperarSchema, restablecerSchema } from "../schemas/auth.schema.js";

export async function registro(req, res) {
  const datos = registroSchema.parse(req.body);
  res.status(201).json(await authService.registrar(datos));
}

export async function login(req, res) {
  res.json(await authService.iniciarSesion(loginSchema.parse(req.body)));
}

export async function me(req, res) {
  res.json(await authService.usuarioActual(req.usuario.id));
}

export async function recuperar(req, res) {
  const { email } = recuperarSchema.parse(req.body);
  await authService.pedirCambioDePassword(email);
  res.json({ ok: true });
}

export async function restablecer(req, res) {
  await authService.cambiarPassword(restablecerSchema.parse(req.body));
  res.json({ ok: true });
}
