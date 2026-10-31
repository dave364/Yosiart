// /api/pedidos
import type { Request, Response } from "express";
import { usuarioDe } from "../middleware/auth.ts";
import * as pedidosService from "../services/pedidos.service.ts";
import { pedidoSchema, estadoSchema, totalSchema, seguimientoSchema } from "../schemas/pedidos.schema.ts";
import { idSchema } from "../schemas/usuarios.schema.ts";

export async function crear(req: Request, res: Response) {
  const datos = pedidoSchema.parse(req.body);
  res.status(201).json(await pedidosService.crear(datos, req.usuario));
}

export async function misPedidos(req: Request, res: Response) {
  res.json(await pedidosService.listarDeUsuario(usuarioDe(req).id));
}

export async function seguimiento(req: Request, res: Response) {
  res.json(await pedidosService.seguimiento(seguimientoSchema.parse(req.query)));
}

// Panel: todos los pedidos (?estado=pendiente para filtrar).
export async function listar(req: Request, res: Response) {
  const estado = req.query.estado ? estadoSchema.shape.estado.parse(req.query.estado) : null;
  res.json(await pedidosService.listar(estado));
}

export async function cambiarEstado(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id);
  res.json(await pedidosService.cambiarEstado(id, estadoSchema.parse(req.body)));
}

export async function cargarTotal(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id);
  const { total } = totalSchema.parse(req.body);
  res.json(await pedidosService.cargarTotal(id, total));
}
