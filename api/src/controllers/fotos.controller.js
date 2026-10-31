// /api/fotos: sirve las fotos que subieron los clientes.
import { buscarFoto } from "../services/fotos.service.js";

// El id es aleatorio (32 caracteres), asi que solo la ve quien tiene el
// enlace: el cliente, el correo de aviso y el panel.
export async function ver(req, res) {
  const foto = await buscarFoto(req.params.id);
  if (!foto) return res.status(404).json({ error: "Foto no encontrada." });

  res.set("Content-Type", foto.mime);
  // Una foto nunca cambia: el navegador la puede guardar para siempre.
  res.set("Cache-Control", "private, max-age=31536000, immutable");
  res.set("X-Content-Type-Options", "nosniff");
  res.send(foto.datos);
}
