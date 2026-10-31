// Tablas pedidos, pedido_items y pedido_historial.
import { db } from "../db.js";

const conTotal = (p) => ({ ...p, total: p.total == null ? null : Number(p.total) });

// Pedidos completos (con sus piezas y su historial) que cumplen una condición.
async function cargar(donde, params) {
  const { rows } = await db.query(
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
  return rows.map(conTotal);
}

export const listarDeUsuario = (usuarioId) => cargar("p.usuario_id = $1", [usuarioId]);

export async function buscarPorNumeroYEmail(numero, email) {
  const [pedido] = await cargar("p.numero = $1 AND p.cliente_email = $2", [numero, email]);
  return pedido || null;
}

export const listar = (estado) => cargar("($1::text IS NULL OR p.estado = $1)", [estado]);

// --- Crear un pedido (todo dentro de una transacción: `conexion`) ---

export async function siguienteNumero(conexion) {
  const { rows } = await conexion.query(`SELECT LPAD(nextval('pedido_numero_seq')::text, 4, '0') AS numero`);
  return rows[0].numero;
}

export async function crear(conexion, { numero, usuarioId, cliente, total }) {
  const { rows } = await conexion.query(
    `INSERT INTO pedidos (numero, usuario_id, cliente_nombre, cliente_email, cliente_telefono, total)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, numero, estado, cliente_nombre, cliente_email, cliente_telefono, total, creado_en`,
    [numero, usuarioId, cliente.cliente_nombre, cliente.cliente_email, cliente.cliente_telefono, total]
  );
  return conTotal(rows[0]);
}

export async function agregarItem(conexion, pedidoId, { productoId, nombre, precio, cantidad, personalizacion }) {
  await conexion.query(
    `INSERT INTO pedido_items
       (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, personalizacion)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [pedidoId, productoId, nombre, precio, cantidad, JSON.stringify(personalizacion)]
  );
}

export async function agregarHistorial(conexion, pedidoId, estado, nota) {
  await conexion.query(`INSERT INTO pedido_historial (pedido_id, estado, nota) VALUES ($1, $2, $3)`, [
    pedidoId,
    estado,
    nota,
  ]);
}

// --- Panel ---

export async function cambiarEstado(conexion, id, estado) {
  const { rows } = await conexion.query(
    `UPDATE pedidos SET estado = $1, actualizado_en = NOW() WHERE id = $2
     RETURNING id, numero, estado, cliente_nombre, cliente_email, total`,
    [estado, id]
  );
  return rows[0] ? conTotal(rows[0]) : null;
}

export async function cambiarTotal(id, total) {
  const { rows } = await db.query(
    `UPDATE pedidos SET total = $1, actualizado_en = NOW() WHERE id = $2 RETURNING id, numero, total`,
    [total, id]
  );
  return rows[0] ? { ...rows[0], total: Number(rows[0].total) } : null;
}
