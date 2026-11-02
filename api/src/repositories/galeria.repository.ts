// Tabla galeria: los trabajos terminados que se muestran en el carrusel.
import { db } from "../db.ts";
import type { Conexion } from "../tipos.ts";

export interface FotoGaleria {
  id: number;
  foto: string; // dirección para mostrarla: /api/fotos/<id>
  titulo: string;
  creado_en: string;
}

const COLUMNAS = `id, '/api/fotos/' || foto_id AS foto, titulo, creado_en`;

// En el orden del carrusel. A igual orden, la más nueva primero.
export async function listar(): Promise<FotoGaleria[]> {
  const { rows } = await db.query<FotoGaleria>(
    `SELECT ${COLUMNAS} FROM galeria ORDER BY orden, creado_en DESC, id DESC`
  );
  return rows;
}

// Una foto nueva va primera: toma un lugar antes de todas las demás.
export async function crear(conexion: Conexion, fotoId: string, titulo: string): Promise<FotoGaleria> {
  const { rows } = await conexion.query<FotoGaleria>(
    `INSERT INTO galeria (foto_id, titulo, orden)
     VALUES ($1, $2, (SELECT COALESCE(MIN(orden), 1) - 1 FROM galeria))
     RETURNING ${COLUMNAS}`,
    [fotoId, titulo]
  );
  return rows[0]!;
}

export async function cambiarTitulo(id: number, titulo: string): Promise<FotoGaleria | null> {
  const { rows } = await db.query<FotoGaleria>(`UPDATE galeria SET titulo = $1 WHERE id = $2 RETURNING ${COLUMNAS}`, [
    titulo,
    id,
  ]);
  return rows[0] || null;
}

export async function ids(conexion: Conexion = db): Promise<number[]> {
  const { rows } = await conexion.query<{ id: number }>(`SELECT id FROM galeria`);
  return rows.map((r) => r.id);
}

// Guarda el orden completo: el primero de la lista queda primero.
export async function ordenar(conexion: Conexion, idsEnOrden: number[]): Promise<void> {
  await conexion.query(
    `UPDATE galeria g SET orden = n.pos
       FROM unnest($1::int[]) WITH ORDINALITY AS n(id, pos)
      WHERE g.id = n.id`,
    [idsEnOrden]
  );
}

// Borra la entrada y su imagen. Devuelve false si no existía.
export async function borrar(conexion: Conexion, id: number): Promise<boolean> {
  const { rows } = await conexion.query<{ foto_id: string }>(`DELETE FROM galeria WHERE id = $1 RETURNING foto_id`, [id]);
  if (!rows[0]) return false;
  await conexion.query(`DELETE FROM fotos WHERE id = $1`, [rows[0].foto_id]);
  return true;
}
