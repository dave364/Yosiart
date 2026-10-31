// Cuentas: registro, login, sesión y recuperar la contraseña.
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { JWT_SECRET, JWT_EXPIRES_IN, SITIO_URL } from "../config.ts";
import { hashPassword, verificarPassword } from "../lib/claves.ts";
import { ErrorHttp, conflicto, datoInvalido, noEncontrado, esDuplicado } from "../lib/errores.ts";
import * as usuariosRepo from "../repositories/usuarios.repository.ts";
import * as resetRepo from "../repositories/resetTokens.repository.ts";
import type { Usuario } from "../tipos.ts";
import type { DatosRegistro, DatosLogin, DatosRestablecer } from "../schemas/auth.schema.ts";
import { mailBienvenida, mailReset, enviarEnSegundoPlano } from "./mail.service.ts";

function firmarToken(usuario: Usuario): string {
  return jwt.sign({ id: usuario.id, email: usuario.email, rol: usuario.rol }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

// Lo que se le muestra al cliente de su propia cuenta.
function publico(usuario: Usuario): Usuario {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    telefono: usuario.telefono,
    rol: usuario.rol,
  };
}

export async function registrar(datos: DatosRegistro) {
  const passwordHash = await hashPassword(datos.password);
  let usuario: Usuario;
  try {
    usuario = await usuariosRepo.crear({ ...datos, passwordHash });
  } catch (err) {
    if (esDuplicado(err)) throw conflicto("Ese email ya esta registrado.");
    throw err;
  }
  // El correo se manda sin esperar respuesta: si Brevo tarda o falla,
  // la cuenta ya quedo creada y el cliente entra igual.
  enviarEnSegundoPlano(usuario.email, usuario.nombre, mailBienvenida(usuario));
  return { token: firmarToken(usuario), usuario: publico(usuario) };
}

export async function iniciarSesion({ email, password }: DatosLogin) {
  const usuario = await usuariosRepo.buscarParaLogin(email);

  // Se compara igual aunque el usuario no exista, para no revelar
  // por diferencia de tiempo si el email esta registrado.
  const { ok, rehacer } = await verificarPassword(password, usuario?.password_hash);
  if (!usuario || !ok) throw new ErrorHttp(401, "Email o contrasena incorrectos.");

  // Cuenta con el formato viejo (bcrypt o más vueltas): se guarda en el nuevo.
  if (rehacer) await usuariosRepo.cambiarPassword(usuario.id, await hashPassword(password));

  // Se revisa despues de la contrasena a proposito: si avisaramos
  // antes, cualquiera podria averiguar que cuentas existen probando
  // direcciones y leyendo cual responde "suspendida".
  if (!usuario.activo) throw new ErrorHttp(403, "Tu cuenta esta suspendida. Escribinos a nuestro correo.");

  return { token: firmarToken(usuario), usuario: publico(usuario) };
}

export async function usuarioActual(id: number) {
  const usuario = await usuariosRepo.buscarActivo(id);
  if (!usuario) throw noEncontrado("Usuario no encontrado.");
  return { usuario: publico(usuario) };
}

// Paso 1: el cliente pide el enlace. Se responde igual exista o no la
// cuenta: si dijeramos "ese email no esta registrado", cualquiera podria
// averiguar quienes son clientes probando direcciones de a una.
export async function pedirCambioDePassword(email: string): Promise<void> {
  const usuario = await usuariosRepo.buscarPorEmail(email);
  if (!usuario) return;

  // El token viaja en el correo; en la base guardamos solo su hash.
  const token = crypto.randomBytes(32).toString("hex");
  await resetRepo.crear(usuario.id, hashDeToken(token));
  enviarEnSegundoPlano(usuario.email, usuario.nombre, mailReset(usuario, SITIO_URL + "/#reset=" + token));
}

// Paso 2: el cliente abre el enlace y elige la contrasena nueva.
export async function cambiarPassword({ token, password }: DatosRestablecer): Promise<void> {
  const pedido = await resetRepo.buscarVigente(hashDeToken(token));
  if (!pedido) throw datoInvalido("El enlace vencio o ya fue usado. Pedi uno nuevo.");

  await usuariosRepo.cambiarPassword(pedido.usuario_id, await hashPassword(password));
  await resetRepo.marcarUsados(pedido.usuario_id);
}

const hashDeToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
