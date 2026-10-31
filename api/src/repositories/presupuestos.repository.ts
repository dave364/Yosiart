// Tabla presupuestos.
import { db } from "../db.ts";
import type { Conexion, Presupuesto } from "../tipos.ts";

type FilaPresupuesto = Omit<Presupuesto, "precio"> & { precio: string | null };

const normalizar = (p: FilaPresupuesto): Presupuesto => ({ ...p, precio: p.precio == null ? null : Number(p.precio) });

export interface NuevoPresupuesto {
  usuarioId: number | null;
  nombre: string;
  email: string;
  telefono: string | null;
  tipo: string;
  cantidad: number | null;
  fecha: string | null;
  descripcion: string;
  fotos: string[];
}

export async function crear(d: NuevoPresupuesto, conexion: Conexion = db): Promise<Presupuesto> {
  const { rows } = await conexion.query<FilaPresupuesto>(
    `INSERT INTO presupuestos
       (usuario_id, nombre, email, telefono, tipo, cantidad, fecha_evento, descripcion, fotos)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [d.usuarioId, d.nombre, d.email, d.telefono, d.tipo, d.cantidad, d.fecha, d.descripcion, JSON.stringify(d.fotos)]
  );
  return normalizar(rows[0]!);
}

export async function listar(estado: string | null): Promise<Presupuesto[]> {
  const { rows } = await db.query<FilaPresupuesto>(
    `SELECT * FROM presupuestos WHERE ($1::text IS NULL OR estado = $1) ORDER BY creado_en DESC`,
    [estado]
  );
  return rows.map(normalizar);
}

// `precio` undefined = no tocarlo; null = borrarlo.
export async function responder(
  id: number,
  { estado, respuesta, precio }: { estado: string; respuesta?: string; precio?: number | null }
): Promise<Presupuesto | null> {
  const { rows } = await db.query<FilaPresupuesto>(
    `UPDATE presupuestos
        SET estado = $1,
            respuesta = COALESCE($2, respuesta),
            precio = CASE WHEN $3::boolean THEN $4 ELSE precio END
      WHERE id = $5
      RETURNING *`,
    [estado, respuesta ?? null, precio !== undefined, precio ?? null, id]
  );
  return rows[0] ? normalizar(rows[0]) : null;
}
