// /api/productos
import type { Request, Response } from "express";
import * as productosService from "../services/productos.service.ts";
import { productoSchema } from "../schemas/productos.schema.ts";

export async function listar(_req: Request, res: Response) {
  res.json(await productosService.listarActivos());
}

export async function listarTodos(_req: Request, res: Response) {
  res.json(await productosService.listarTodos());
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await productosService.crear(productoSchema.parse(req.body)));
}

export async function actualizar(req: Request, res: Response) {
  const datos = productoSchema.parse(req.body);
  res.json(await productosService.actualizar(String(req.params.id), datos));
}

export async function desactivar(req: Request, res: Response) {
  res.json(await productosService.desactivar(String(req.params.id)));
}
