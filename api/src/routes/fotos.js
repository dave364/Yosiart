import { Router } from "express";
import { query } from "../db.js";

export const router = Router();

// Sirve una foto guardada. El id es aleatorio (32 caracteres), asi que
// solo la ve quien tiene el enlace: el cliente, el correo de aviso y el panel.
router.get("/:id", async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{32}$/.test(req.params.id)) return res.status(404).json({ error: "Foto no encontrada." });
    const { rows } = await query(`SELECT mime, datos FROM fotos WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Foto no encontrada." });

    res.set("Content-Type", rows[0].mime);
    // Una foto nunca cambia: el navegador la puede guardar para siempre.
    res.set("Cache-Control", "private, max-age=31536000, immutable");
    res.set("X-Content-Type-Options", "nosniff");
    res.send(rows[0].datos);
  } catch (err) {
    next(err);
  }
});
