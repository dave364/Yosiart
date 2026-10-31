// /api/presupuestos
import * as presupuestosService from "../services/presupuestos.service.js";
import { presupuestoSchema, respuestaSchema } from "../schemas/presupuestos.schema.js";
import { idSchema } from "../schemas/usuarios.schema.js";

export async function crear(req, res) {
  const datos = presupuestoSchema.parse(req.body);
  res.status(201).json(await presupuestosService.crear(datos, req.usuario?.id));
}

// Panel: todos los presupuestos (?estado=nuevo para filtrar).
export async function listar(req, res) {
  const estado = req.query.estado ? respuestaSchema.shape.estado.parse(req.query.estado) : null;
  res.json(await presupuestosService.listar(estado));
}

export async function responder(req, res) {
  const id = idSchema.parse(req.params.id);
  res.json(await presupuestosService.responder(id, respuestaSchema.parse(req.body)));
}
