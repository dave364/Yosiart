// Galería de trabajos terminados.
import { withTransaction } from "../db.ts";
import { noEncontrado } from "../lib/errores.ts";
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

export async function borrar(id: number): Promise<{ ok: true }> {
  const borrada = await withTransaction((conexion) => galeriaRepo.borrar(conexion, id));
  if (!borrada) throw noEncontrado("Esa foto ya no está en la galería.");
  return { ok: true };
}
