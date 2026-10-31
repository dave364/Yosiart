// /api/usuarios (panel)
import type { Request, Response } from "express";
import { usuarioDe } from "../middleware/auth.ts";
import * as usuariosService from "../services/usuarios.service.ts";
import { idSchema, activoSchema } from "../schemas/usuarios.schema.ts";

export async function listar(_req: Request, res: Response) {
  res.json(await usuariosService.listar());
}

export async function cambiarActivo(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id);
  const { activo } = activoSchema.parse(req.body);
  res.json(await usuariosService.cambiarActivo(usuarioDe(req).id, id, activo));
}
