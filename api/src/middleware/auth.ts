import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { UsuarioToken } from "../tipos.ts";
import { ErrorHttp } from "../lib/errores.ts";
import { JWT_SECRET } from "../config.ts";

function leerToken(req: Request): UsuarioToken | null {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as UsuarioToken;
  } catch {
    return null;
  }
}

// No corta la request: si hay token valido deja req.usuario, si no sigue igual.
// Se usa en el checkout, que funciona con o sin cuenta.
export function autenticacionOpcional(req: Request, _res: Response, next: NextFunction) {
  req.usuario = leerToken(req);
  next();
}

// Exige sesion valida.
export function requiereAuth(req: Request, res: Response, next: NextFunction) {
  const usuario = leerToken(req);
  if (!usuario) {
    return res.status(401).json({ error: "Necesitas iniciar sesion." });
  }
  req.usuario = usuario;
  next();
}

// Exige rol admin.
export function requiereAdmin(req: Request, res: Response, next: NextFunction) {
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

// Para los controladores de rutas con requiereAuth o requiereAdmin: ahí la
// sesión siempre está. Si alguna vez faltara, responde como sin sesión.
export function usuarioDe(req: Request): UsuarioToken {
  if (!req.usuario) throw new ErrorHttp(401, "Necesitas iniciar sesion.");
  return req.usuario;
}
