// /api/fotos: sirve las fotos que subieron los clientes.
import { buscarFoto } from "../services/fotos.service.ts";

// El id es aleatorio (32 caracteres), asi que solo la ve quien tiene el
// enlace: el cliente, el correo de aviso y el panel.
import type { Request, Response } from "express";
export async function ver(req: Request, res: Response) {
  const foto = await buscarFoto(String(req.params.id));
  if (!foto) return res.status(404).json({ error: "Foto no encontrada." });

  res.set("Content-Type", foto.mime);
  // Una foto nunca cambia: el navegador la puede guardar para siempre.
  res.set("Cache-Control", "private, max-age=31536000, immutable");
  res.set("X-Content-Type-Options", "nosniff");
  res.send(foto.datos);
}
