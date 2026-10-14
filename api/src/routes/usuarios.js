import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { requiereAdmin } from "../middleware/auth.js";

export const router = Router();

// Solo el administrador ve la lista de clientes.
router.use(requiereAdmin);

// Listado de clientes con su actividad. Nunca devolvemos password_hash:
// el hash no le sirve a nadie en la interfaz y filtrarlo seria un riesgo
// inutil. La contraseña no se puede "ver", solo reemplazar.
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         u.id, u.nombre, u.email, u.telefono, u.rol, u.activo, u.creado_en,
         COUNT(p.id) FILTER (WHERE p.estado <> 'cancelado')               AS pedidos,
         COALESCE(SUM(p.total) FILTER (WHERE p.estado <> 'cancelado'), 0) AS gastado,
         COUNT(p.id) FILTER (WHERE p.estado = 'pendiente')                AS pendientes
       FROM usuarios u
       LEFT JOIN pedidos p ON p.usuario_id = u.id
       GROUP BY u.id
       ORDER BY u.creado_en DESC`
    );
    res.json(
      rows.map((u) => ({
        ...u,
        pedidos: Number(u.pedidos),
        pendientes: Number(u.pendientes),
        gastado: Number(u.gastado),
      }))
    );
  } catch (err) {
    next(err);
  }
});

const idSchema = z.coerce.number().int().positive();

// Suspender o reactivar una cuenta.
router.patch("/:id/activo", async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const { activo } = z.object({ activo: z.boolean() }).parse(req.body);

    // Un admin no se puede suspender a si mismo: quedaria afuera del
    // panel sin forma de volver a entrar.
    if (id === req.usuario.id) {
      const err = new Error("No podes suspender tu propia cuenta.");
      err.status = 400;
      throw err;
    }

    const { rows } = await query(
      `UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING id, activo`,
      [activo, id]
    );
    if (!rows[0]) {
      const err = new Error("Ese cliente no existe.");
      err.status = 404;
      throw err;
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
