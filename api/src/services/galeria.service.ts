// Galería de trabajos terminados.
import { withTransaction } from "../db.ts";
import { datoInvalido, noEncontrado } from "../lib/errores.ts";
import * as galeriaRepo from "../repositories/galeria.repository.ts";
import type { FotoGaleria } from "../repositories/galeria.repository.ts";
import type { DatosFotoGaleria } from "../schemas/galeria.schema.ts";
import { guardarFoto } from "./fotos.service.ts";

// Código de Postgres cuando la tabla todavía no existe.
const sinTabla = (err: unknown) => (err as { code?: string } | null)?.code === "42P01";

// Si la tabla todavía no se creó en la base, el inicio muestra la galería
// vacía en vez de fallar.
export async function listar(): Promise<FotoGaleria[]> {
  try {
    return await galeriaRepo.listar();
  } catch (err) {
    if (sinTabla(err)) return [];
    throw err;
  }
}

export async function agregar({ foto, titulo }: DatosFotoGaleria): Promise<FotoGaleria> {
  return withTransaction(async (conexion) => {
    const direccion = await guardarFoto(conexion, foto); // /api/fotos/<id>
    return galeriaRepo.crear(conexion, direccion.split("/").pop()!, titulo);
  });
}

export async function cambiarTitulo(id: number, titulo: string): Promise<FotoGaleria> {
  const foto = await galeriaRepo.cambiarTitulo(id, titulo);
  if (!foto) throw noEncontrado("Esa foto ya no está en la galería.");
  return foto;
}

// Recibe todas las fotos en el orden nuevo. Si la lista no coincide con lo
// que hay (alguien subió o sacó una foto mientras tanto), no cambia nada.
export async function ordenar(idsEnOrden: number[]): Promise<FotoGaleria[]> {
  await withTransaction(async (conexion) => {
    const actuales = await galeriaRepo.ids(conexion);
    const pedidos = new Set(idsEnOrden);
    const coincide =
      pedidos.size === idsEnOrden.length &&
      idsEnOrden.length === actuales.length &&
      actuales.every((id) => pedidos.has(id));
    if (!coincide) throw datoInvalido("La galería cambió mientras la ordenabas. Actualizá la página y probá de nuevo.");
    await galeriaRepo.ordenar(conexion, idsEnOrden);
  });
  return galeriaRepo.listar();
}

export async function borrar(id: number): Promise<{ ok: true }> {
  const borrada = await withTransaction((conexion) => galeriaRepo.borrar(conexion, id));
  if (!borrada) throw noEncontrado("Esa foto ya no está en la galería.");
  return { ok: true };
}
