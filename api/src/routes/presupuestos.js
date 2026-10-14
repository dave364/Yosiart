import { Router } from "express";
import { z } from "zod";
import { query, withTransaction } from "../db.js";
import { autenticacionOpcional, requiereAdmin } from "../middleware/auth.js";
import { telefonoValido, normalizarTelefono } from "../telefono.js";
import { guardarFoto } from "../fotos.js";
import {
  mailPresupuestoRecibido,
  mailRespuestaPresupuesto,
  avisarPresupuestoNuevo,
  enviarEnSegundoPlano,
} from "../mail.js";

export const router = Router();

const TIPOS = ["Souvenirs para un evento", "Pieza única a medida", "Regalo personalizado", "Otro"];
const MAX_FOTOS = 3;

// "" llega de los campos opcionales que el cliente dejo vacios.
const vacioANull = (v) => (v === "" || v === undefined ? null : v);

const presupuestoSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  telefono: z.preprocess(
    vacioANull,
    z.string().trim().refine(telefonoValido, "El telefono tiene que tener 10 digitos, con el codigo de area")
      .transform(normalizarTelefono).nullable()
  ),
  tipo: z.enum(TIPOS),
  cantidad: z.preprocess(vacioANull, z.coerce.number().int().min(1).max(5000).nullable()),
  fecha: z.preprocess(vacioANull, z.iso.date().nullable()),
  descripcion: z.string().trim().min(10).max(2000),
  fotos: z.array(z.string().max(3_000_000)).max(MAX_FOTOS).default([]),
});

const respuestaSchema = z.object({
  estado: z.enum(["nuevo", "respondido", "aceptado", "rechazado"]),
  respuesta: z.string().trim().max(2000).optional(),
  precio: z.coerce.number().nonnegative().nullable().optional(),
});

const normalizar = (p) => ({ ...p, precio: p.precio == null ? null : Number(p.precio) });

router.post("/", autenticacionOpcional, async (req, res, next) => {
  try {
    const d = presupuestoSchema.parse(req.body);

    const presupuesto = await withTransaction(async (client) => {
      const fotos = [];
      for (const foto of d.fotos) fotos.push(await guardarFoto(client, foto));

      const { rows } = await client.query(
        `INSERT INTO presupuestos
           (usuario_id, nombre, email, telefono, tipo, cantidad, fecha_evento, descripcion, fotos)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [req.usuario?.id ?? null, d.nombre, d.email, d.telefono, d.tipo, d.cantidad, d.fecha,
         d.descripcion, JSON.stringify(fotos)]
      );
      return normalizar(rows[0]);
    });

    enviarEnSegundoPlano(presupuesto.email, presupuesto.nombre, mailPresupuestoRecibido(presupuesto));
    avisarPresupuestoNuevo(presupuesto);

    res.status(201).json({ id: presupuesto.id, estado: presupuesto.estado });
  } catch (err) {
    next(err);
  }
});

// Panel: todos los presupuestos (?estado=nuevo para filtrar).
router.get("/", requiereAdmin, async (req, res, next) => {
  try {
    const estado = req.query.estado ? respuestaSchema.shape.estado.parse(req.query.estado) : null;
    const { rows } = await query(
      `SELECT * FROM presupuestos WHERE ($1::text IS NULL OR estado = $1) ORDER BY creado_en DESC`,
      [estado]
    );
    res.json(rows.map(normalizar));
  } catch (err) {
    next(err);
  }
});

// Yosi responde: si manda una respuesta, le llega al cliente por correo.
router.patch("/:id", requiereAdmin, async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const d = respuestaSchema.parse(req.body);

    const { rows } = await query(
      `UPDATE presupuestos
          SET estado = $1,
              respuesta = COALESCE($2, respuesta),
              precio = CASE WHEN $3::boolean THEN $4 ELSE precio END
        WHERE id = $5
        RETURNING *`,
      [d.estado, d.respuesta ?? null, d.precio !== undefined, d.precio ?? null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Presupuesto no encontrado." });
    const presupuesto = normalizar(rows[0]);

    if (d.respuesta) {
      enviarEnSegundoPlano(presupuesto.email, presupuesto.nombre, mailRespuestaPresupuesto(presupuesto));
    }
    res.json(presupuesto);
  } catch (err) {
    next(err);
  }
});
