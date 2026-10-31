// Clientes, vistos desde el panel.
import { datoInvalido, noEncontrado } from "../lib/errores.js";
import * as usuariosRepo from "../repositories/usuarios.repository.js";

export async function listar() {
  const filas = await usuariosRepo.listarConActividad();
  return filas.map((u) => ({
    ...u,
    pedidos: Number(u.pedidos),
    pendientes: Number(u.pendientes),
    gastado: Number(u.gastado),
  }));
}

// Suspender o reactivar una cuenta.
export async function cambiarActivo(adminId, id, activo) {
  // Un admin no se puede suspender a si mismo: quedaria afuera del
  // panel sin forma de volver a entrar.
  if (id === adminId) throw datoInvalido("No podes suspender tu propia cuenta.");
  const usuario = await usuariosRepo.cambiarActivo(id, activo);
  if (!usuario) throw noEncontrado("Ese cliente no existe.");
  return usuario;
}
