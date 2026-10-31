// /api/presupuestos
import * as presupuestosService from "../services/presupuestos.service.ts";
import { presupuestoSchema, respuestaSchema } from "../schemas/presupuestos.schema.ts";
import { idSchema } from "../schemas/usuarios.schema.ts";

export async function crear(req: Request, res: Response) {
  const datos = presupuestoSchema.parse(req.body);
  res.status(201).json(await presupuestosService.crear(datos, req.usuario?.id));
}

// Panel: todos los presupuestos (?estado=nuevo para filtrar).
import type { Request, Response } from "express";
export async function listar(req: Request, res: Response) {
  const estado = req.query.estado ? respuestaSchema.shape.estado.parse(req.query.estado) : null;
  res.json(await presupuestosService.listar(estado));
}

export async function responder(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id);
  res.json(await presupuestosService.responder(id, respuestaSchema.parse(req.body)));
}
