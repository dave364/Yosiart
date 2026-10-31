// Pedidos de presupuesto (souvenirs, piezas a medida).
import { withTransaction } from "../db.ts";
import { noEncontrado } from "../lib/errores.ts";
import * as presupuestosRepo from "../repositories/presupuestos.repository.ts";
import { guardarFoto } from "./fotos.service.ts";
import type { DatosPresupuesto, DatosRespuesta } from "../schemas/presupuestos.schema.ts";
import {
  mailPresupuestoRecibido,
  mailRespuestaPresupuesto,
  avisarPresupuestoNuevo,
  enviarEnSegundoPlano,
} from "./mail.service.ts";

export async function crear(datos: DatosPresupuesto, usuarioId: number | undefined) {
  // Las fotos y el presupuesto se guardan juntos: si algo falla, no queda nada a medias.
  const presupuesto = await withTransaction(async (conexion) => {
    const fotos: string[] = [];
    for (const foto of datos.fotos) fotos.push(await guardarFoto(conexion, foto));
    return presupuestosRepo.crear({ ...datos, fotos, usuarioId: usuarioId ?? null }, conexion);
  });

  enviarEnSegundoPlano(presupuesto.email, presupuesto.nombre, mailPresupuestoRecibido(presupuesto));
  avisarPresupuestoNuevo(presupuesto);
  return { id: presupuesto.id, estado: presupuesto.estado };
}

export const listar = (estado: string | null) => presupuestosRepo.listar(estado);

// Yosi responde: si manda una respuesta, le llega al cliente por correo.
export async function responder(id: number, datos: DatosRespuesta) {
  const presupuesto = await presupuestosRepo.responder(id, datos);
  if (!presupuesto) throw noEncontrado("Presupuesto no encontrado.");
  if (datos.respuesta) {
    enviarEnSegundoPlano(presupuesto.email, presupuesto.nombre, mailRespuestaPresupuesto(presupuesto));
  }
  return presupuesto;
}
