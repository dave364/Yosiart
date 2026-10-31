// /api/usuarios (panel)
import * as usuariosService from "../services/usuarios.service.js";
import { idSchema, activoSchema } from "../schemas/usuarios.schema.js";

export async function listar(_req, res) {
  res.json(await usuariosService.listar());
}

export async function cambiarActivo(req, res) {
  const id = idSchema.parse(req.params.id);
  const { activo } = activoSchema.parse(req.body);
  res.json(await usuariosService.cambiarActivo(req.usuario.id, id, activo));
}
