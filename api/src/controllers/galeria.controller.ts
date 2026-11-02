// /api/galeria
import type { Request, Response } from "express";
import * as galeriaService from "../services/galeria.service.ts";
import { fotoGaleriaSchema } from "../schemas/galeria.schema.ts";
import { idSchema } from "../schemas/usuarios.schema.ts";

export async function listar(_req: Request, res: Response) {
  res.json(await galeriaService.listar());
}

export async function agregar(req: Request, res: Response) {
  res.status(201).json(await galeriaService.agregar(fotoGaleriaSchema.parse(req.body)));
}

export async function borrar(req: Request, res: Response) {
  res.json(await galeriaService.borrar(idSchema.parse(req.params.id)));
}
