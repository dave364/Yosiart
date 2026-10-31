// /api/auth: lee el pedido, valida los datos y responde.
import type { Request, Response } from "express";
import { usuarioDe } from "../middleware/auth.ts";
import * as authService from "../services/auth.service.ts";
import { registroSchema, loginSchema, recuperarSchema, restablecerSchema } from "../schemas/auth.schema.ts";

export async function registro(req: Request, res: Response) {
  const datos = registroSchema.parse(req.body);
  res.status(201).json(await authService.registrar(datos));
}

export async function login(req: Request, res: Response) {
  res.json(await authService.iniciarSesion(loginSchema.parse(req.body)));
}

export async function me(req: Request, res: Response) {
  res.json(await authService.usuarioActual(usuarioDe(req).id));
}

export async function recuperar(req: Request, res: Response) {
  const { email } = recuperarSchema.parse(req.body);
  await authService.pedirCambioDePassword(email);
  res.json({ ok: true });
}

export async function restablecer(req: Request, res: Response) {
  await authService.cambiarPassword(restablecerSchema.parse(req.body));
  res.json({ ok: true });
}
