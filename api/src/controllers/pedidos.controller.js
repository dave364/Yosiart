// /api/pedidos
import * as pedidosService from "../services/pedidos.service.js";
import { pedidoSchema, estadoSchema, totalSchema, seguimientoSchema } from "../schemas/pedidos.schema.js";
import { idSchema } from "../schemas/usuarios.schema.js";

export async function crear(req, res) {
  const datos = pedidoSchema.parse(req.body);
  res.status(201).json(await pedidosService.crear(datos, req.usuario));
}

export async function misPedidos(req, res) {
  res.json(await pedidosService.listarDeUsuario(req.usuario.id));
}

export async function seguimiento(req, res) {
  res.json(await pedidosService.seguimiento(seguimientoSchema.parse(req.query)));
}

// Panel: todos los pedidos (?estado=pendiente para filtrar).
export async function listar(req, res) {
  const estado = req.query.estado ? estadoSchema.shape.estado.parse(req.query.estado) : null;
  res.json(await pedidosService.listar(estado));
}

export async function cambiarEstado(req, res) {
  const id = idSchema.parse(req.params.id);
  res.json(await pedidosService.cambiarEstado(id, estadoSchema.parse(req.body)));
}

export async function cargarTotal(req, res) {
  const id = idSchema.parse(req.params.id);
  const { total } = totalSchema.parse(req.body);
  res.json(await pedidosService.cargarTotal(id, total));
}
