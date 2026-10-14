import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

function leerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// No corta la request: si hay token valido deja req.usuario, si no sigue igual.
// Se usa en el checkout, que funciona con o sin cuenta.
export function autenticacionOpcional(req, _res, next) {
  req.usuario = leerToken(req);
  next();
}

// Exige sesion valida.
export function requiereAuth(req, res, next) {
  const usuario = leerToken(req);
  if (!usuario) {
    return res.status(401).json({ error: "Necesitas iniciar sesion." });
  }
  req.usuario = usuario;
  next();
}

// Exige rol admin.
export function requiereAdmin(req, res, next) {
  const usuario = leerToken(req);
  if (!usuario) {
    return res.status(401).json({ error: "Necesitas iniciar sesion." });
  }
  if (usuario.rol !== "admin") {
    return res.status(403).json({ error: "No tenes permisos para esto." });
  }
  req.usuario = usuario;
  next();
}
