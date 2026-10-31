// Pedidos de presupuesto (souvenirs, piezas a medida).
import { withTransaction } from "../db.js";
import { noEncontrado } from "../lib/errores.js";
import * as presupuestosRepo from "../repositories/presupuestos.repository.js";
import { guardarFoto } from "./fotos.service.js";
import {
  mailPresupuestoRecibido,
  mailRespuestaPresupuesto,
  avisarPresupuestoNuevo,
  enviarEnSegundoPlano,
} from "./mail.service.js";

export async function crear(datos, usuarioId) {
  // Las fotos y el presupuesto se guardan juntos: si algo falla, no queda nada a medias.
  const presupuesto = await withTransaction(async (conexion) => {
    const fotos = [];
    for (const foto of datos.fotos) fotos.push(await guardarFoto(conexion, foto));
    return presupuestosRepo.crear({ ...datos, fotos, usuarioId: usuarioId ?? null }, conexion);
  });

  enviarEnSegundoPlano(presupuesto.email, presupuesto.nombre, mailPresupuestoRecibido(presupuesto));
  avisarPresupuestoNuevo(presupuesto);
  return { id: presupuesto.id, estado: presupuesto.estado };
}

export const listar = (estado) => presupuestosRepo.listar(estado);

// Yosi responde: si manda una respuesta, le llega al cliente por correo.
export async function responder(id, datos) {
  const presupuesto = await presupuestosRepo.responder(id, datos);
  if (!presupuesto) throw noEncontrado("Presupuesto no encontrado.");
  if (datos.respuesta) {
    enviarEnSegundoPlano(presupuesto.email, presupuesto.nombre, mailRespuestaPresupuesto(presupuesto));
  }
  return presupuesto;
}
