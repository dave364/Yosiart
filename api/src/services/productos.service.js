// Piezas del catálogo.
import { conflicto, noEncontrado, esDuplicado } from "../lib/errores.js";
import * as productosRepo from "../repositories/productos.repository.js";

export const listarActivos = () => productosRepo.listarActivos();
export const listarTodos = () => productosRepo.listarTodos();

const slugRepetido = (err) => {
  if (esDuplicado(err)) throw conflicto("Ya hay un producto con ese slug.");
  throw err;
};

export async function crear(datos) {
  return productosRepo.crear(datos).catch(slugRepetido);
}

export async function actualizar(id, datos) {
  const producto = await productosRepo.actualizar(id, datos).catch(slugRepetido);
  if (!producto) throw noEncontrado("Producto no encontrado.");
  return producto;
}

// Baja logica: nunca se borra de verdad, porque hay pedidos viejos
// que referencian este producto y perderian su historial.
export async function desactivar(id) {
  if (!(await productosRepo.desactivar(id))) throw noEncontrado("Producto no encontrado.");
  return { ok: true, mensaje: "Producto desactivado." };
}
