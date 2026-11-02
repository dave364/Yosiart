// Tabla galeria: los trabajos terminados que se muestran en el carrusel.
import { db } from "../db.ts";
import type { Conexion } from "../tipos.ts";

export interface FotoGaleria {
  id: number;
  foto: string; // dirección para mostrarla: /api/fotos/<id>
  titulo: string;
  creado_en: string;
}

// La más nueva primero.
export async function listar(): Promise<FotoGaleria[]> {
  const { rows } = await db.query<FotoGaleria>(
    `SELECT id, '/api/fotos/' || foto_id AS foto, titulo, creado_en
       FROM galeria ORDER BY creado_en DESC, id DESC`
  );
  return rows;
}

export async function crear(conexion: Conexion, fotoId: string, titulo: string): Promise<FotoGaleria> {
  const { rows } = await conexion.query<FotoGaleria>(
    `INSERT INTO galeria (foto_id, titulo) VALUES ($1, $2)
     RETURNING id, '/api/fotos/' || foto_id AS foto, titulo, creado_en`,
    [fotoId, titulo]
  );
  return rows[0]!;
}

// Borra la entrada y su imagen. Devuelve false si no existía.
export async function borrar(conexion: Conexion, id: number): Promise<boolean> {
  const { rows } = await conexion.query<{ foto_id: string }>(`DELETE FROM galeria WHERE id = $1 RETURNING foto_id`, [id]);
  if (!rows[0]) return false;
  await conexion.query(`DELETE FROM fotos WHERE id = $1`, [rows[0].foto_id]);
  return true;
}
