// /api/productos
import * as productosService from "../services/productos.service.js";
import { productoSchema } from "../schemas/productos.schema.js";

export async function listar(_req, res) {
  res.json(await productosService.listarActivos());
}

export async function listarTodos(_req, res) {
  res.json(await productosService.listarTodos());
}

export async function crear(req, res) {
  res.status(201).json(await productosService.crear(productoSchema.parse(req.body)));
}

export async function actualizar(req, res) {
  const datos = productoSchema.parse(req.body);
  res.json(await productosService.actualizar(req.params.id, datos));
}

export async function desactivar(req, res) {
  res.json(await productosService.desactivar(req.params.id));
}
