// /api/galeria
import type { Request, Response } from "express";
import * as galeriaService from "../services/galeria.service.ts";
import { fotoGaleriaSchema, tituloSchema, ordenSchema } from "../schemas/galeria.schema.ts";
import { idSchema } from "../schemas/usuarios.schema.ts";

export async function listar(_req: Request, res: Response) {
  res.json(await galeriaService.listar());
}

export async function agregar(req: Request, res: Response) {
  res.status(201).json(await galeriaService.agregar(fotoGaleriaSchema.parse(req.body)));
}

export async function cambiarTitulo(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id);
  const { titulo } = tituloSchema.parse(req.body);
  res.json(await galeriaService.cambiarTitulo(id, titulo));
}

export async function ordenar(req: Request, res: Response) {
  res.json(await galeriaService.ordenar(ordenSchema.parse(req.body).ids));
}

export async function borrar(req: Request, res: Response) {
  res.json(await galeriaService.borrar(idSchema.parse(req.params.id)));
}
