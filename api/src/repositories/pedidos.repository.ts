// Tablas pedidos, pedido_items y pedido_historial.
import { db } from "../db.ts";
import type { Conexion, Pedido, PedidoItem, Personalizacion } from "../tipos.ts";

// Así llega de Postgres: NUMERIC viene como texto.
type ConTotalTexto<T extends { total: number | null }> = Omit<T, "total"> & { total: string | null };

const conTotal = <T extends { total: number | null }>(p: ConTotalTexto<T>): T =>
  ({ ...p, total: p.total == null ? null : Number(p.total) }) as T;

export interface Historial {
  estado: string;
  nota: string | null;
  fecha: string;
}

// Un pedido completo, como lo ven el cliente y el panel.
export interface PedidoCompleto extends Pedido {
  usuario_id: number | null;
  cliente_telefono: string;
  actualizado_en: string;
  items: PedidoItem[];
  historial: Historial[];
}

// Pedidos completos (con sus piezas y su historial) que cumplen una condición.
async function cargar(donde: string, params: unknown[]): Promise<PedidoCompleto[]> {
  const { rows } = await db.query<ConTotalTexto<PedidoCompleto>>(
    `SELECT p.id, p.numero, p.usuario_id, p.cliente_nombre, p.cliente_email, p.cliente_telefono,
            p.estado, p.total, p.creado_en, p.actualizado_en,
            COALESCE((SELECT json_agg(json_build_object(
                        'nombre', i.nombre_producto,
                        'precio_unitario', i.precio_unitario,
                        'cantidad', i.cantidad,
                        'personalizacion', i.personalizacion) ORDER BY i.id)
                        FROM pedido_items i WHERE i.pedido_id = p.id), '[]') AS items,
            COALESCE((SELECT json_agg(json_build_object(
                        'estado', h.estado, 'nota', h.nota, 'fecha', h.creado_en) ORDER BY h.creado_en, h.id)
                        FROM pedido_historial h WHERE h.pedido_id = p.id), '[]') AS historial
       FROM pedidos p
      WHERE ${donde}
      ORDER BY p.creado_en DESC`,
    params
  );
  return rows.map((p) => conTotal<PedidoCompleto>(p));
}

export const listarDeUsuario = (usuarioId: number) => cargar("p.usuario_id = $1", [usuarioId]);

export async function buscarPorNumeroYEmail(numero: string, email: string): Promise<PedidoCompleto | null> {
  const [pedido] = await cargar("p.numero = $1 AND p.cliente_email = $2", [numero, email]);
  return pedido || null;
}

export const listar = (estado: string | null) => cargar("($1::text IS NULL OR p.estado = $1)", [estado]);

// --- Crear un pedido (todo dentro de una transacción: `conexion`) ---

export async function siguienteNumero(conexion: Conexion): Promise<string> {
  const { rows } = await conexion.query<{ numero: string }>(
    `SELECT LPAD(nextval('pedido_numero_seq')::text, 4, '0') AS numero`
  );
  return rows[0]!.numero;
}

export interface DatosCliente {
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string;
}

export async function crear(
  conexion: Conexion,
  { numero, usuarioId, cliente, total }: { numero: string; usuarioId: number | null; cliente: DatosCliente; total: number | null }
): Promise<Pedido> {
  const { rows } = await conexion.query<ConTotalTexto<Pedido>>(
    `INSERT INTO pedidos (numero, usuario_id, cliente_nombre, cliente_email, cliente_telefono, total)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, numero, estado, cliente_nombre, cliente_email, cliente_telefono, total, creado_en`,
    [numero, usuarioId, cliente.cliente_nombre, cliente.cliente_email, cliente.cliente_telefono, total]
  );
  return conTotal<Pedido>(rows[0]!);
}

export async function agregarItem(
  conexion: Conexion,
  pedidoId: number,
  item: { productoId: number; nombre: string; precio: number | null; cantidad: number; personalizacion: Personalizacion }
): Promise<void> {
  await conexion.query(
    `INSERT INTO pedido_items
       (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, personalizacion)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [pedidoId, item.productoId, item.nombre, item.precio, item.cantidad, JSON.stringify(item.personalizacion)]
  );
}

export async function agregarHistorial(conexion: Conexion, pedidoId: number, estado: string, nota: string | null): Promise<void> {
  await conexion.query(`INSERT INTO pedido_historial (pedido_id, estado, nota) VALUES ($1, $2, $3)`, [
    pedidoId,
    estado,
    nota,
  ]);
}

// --- Panel ---

export async function cambiarEstado(conexion: Conexion, id: number, estado: string): Promise<Pedido | null> {
  const { rows } = await conexion.query<ConTotalTexto<Pedido>>(
    `UPDATE pedidos SET estado = $1, actualizado_en = NOW() WHERE id = $2
     RETURNING id, numero, estado, cliente_nombre, cliente_email, total`,
    [estado, id]
  );
  return rows[0] ? conTotal<Pedido>(rows[0]) : null;
}

export async function cambiarTotal(id: number, total: number): Promise<{ id: number; numero: string; total: number } | null> {
  const { rows } = await db.query<{ id: number; numero: string; total: string }>(
    `UPDATE pedidos SET total = $1, actualizado_en = NOW() WHERE id = $2 RETURNING id, numero, total`,
    [total, id]
  );
  return rows[0] ? { ...rows[0], total: Number(rows[0].total) } : null;
}
