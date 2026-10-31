import express from "express";
import cors from "cors";
import { ORIGENES } from "./config.js";
// Mensajes de validación en español para toda la API.
import "./schemas/campos.js";
import { router as authRouter } from "./routes/auth.routes.js";
import { router as productosRouter } from "./routes/productos.routes.js";
import { router as pedidosRouter } from "./routes/pedidos.routes.js";
import { router as presupuestosRouter } from "./routes/presupuestos.routes.js";
import { router as fotosRouter } from "./routes/fotos.routes.js";
import { router as usuariosRouter } from "./routes/usuarios.routes.js";
import { limite } from "./middleware/limite.js";
import { conexionPorPedido } from "./db.js";
import { rutaInexistente, manejarErrores } from "./middleware/errores.js";

// La aplicacion de la API. La arranca src/index.js en tu PC, y
// worker/index.js en Cloudflare (junto con la tienda).
export const app = express();

// En tu PC no hay proxy adelante; en Cloudflare la IP real llega en
// CF-Connecting-IP (ver middleware/limite.js).
app.set("trust proxy", false);

app.use(conexionPorPedido);

app.use(cors({
  origin(origin, cb) {
    // Sin origin = curl, apps moviles, health checks.
    // Un origen no permitido simplemente no recibe las cabeceras CORS:
    // es el navegador el que bloquea la respuesta. Lanzar un error aca
    // devolveria un 500 confuso que ademas tapa el 401 o 403 real.
    cb(null, !origin || ORIGENES.includes(origin));
  },
}));

// Los pedidos y presupuestos pueden traer fotos adentro, asi que aceptan
// cuerpos mas grandes. El resto de la API se queda en 100 KB.
const conFotos = express.json({ limit: "8mb" });
app.use("/api/pedidos", conFotos);
app.use("/api/presupuestos", conFotos);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- Limites de intentos ---
// Van antes de las rutas para cortar el pedido antes de que llegue.

// Probar contrasenas de a miles: 10 intentos cada 15 minutos por IP.
app.use("/api/auth/login", limite({
  ventanaMs: 15 * 60 * 1000,
  max: 10,
  mensaje: "Demasiados intentos. Espera unos minutos y volve a probar.",
}));

// Crear cuentas en masa manda un correo de bienvenida por cada una.
app.use("/api/auth/registro", limite({
  ventanaMs: 60 * 60 * 1000,
  max: 5,
  mensaje: "Demasiados registros desde esta conexion. Proba mas tarde.",
}));

// Recuperar contrasena manda un correo en cada pedido: sin freno, se
// pueden quemar los 100 envios diarios de Brevo en un minuto. Se limita
// dos veces: por conexion, y por email para no inundar una casilla.
app.use("/api/auth/recuperar", limite({
  ventanaMs: 60 * 60 * 1000,
  max: 5,
  mensaje: "Ya pediste varios enlaces. Revisa tu correo, incluido spam.",
}));
app.use("/api/auth/recuperar", limite({
  ventanaMs: 60 * 60 * 1000,
  max: 3,
  mensaje: "Ya pediste varios enlaces. Revisa tu correo, incluido spam.",
  clave: (req) => String(req.body?.email || "").trim().toLowerCase(),
}));

// Cada pedido manda dos correos y puede guardar fotos.
app.post("/api/pedidos", limite({
  ventanaMs: 15 * 60 * 1000,
  max: 10,
  mensaje: "Demasiados pedidos seguidos. Proba de nuevo en unos minutos.",
}));

app.post("/api/presupuestos", limite({
  ventanaMs: 60 * 60 * 1000,
  max: 5,
  mensaje: "Ya enviaste varios pedidos de presupuesto. Te respondemos pronto.",
}));

// Probar numeros de pedido para adivinar emails.
app.get("/api/pedidos/seguimiento", limite({
  ventanaMs: 15 * 60 * 1000,
  max: 30,
  mensaje: "Demasiadas consultas. Espera unos minutos.",
}));

app.use("/api/auth", authRouter);
app.use("/api/productos", productosRouter);
app.use("/api/pedidos", pedidosRouter);
app.use("/api/presupuestos", presupuestosRouter);
app.use("/api/fotos", fotosRouter);
app.use("/api/usuarios", usuariosRouter);

app.use(rutaInexistente);
app.use(manejarErrores);
