import express from "express";
import cors from "cors";
import { PORT, ORIGENES } from "./config.js";
import "./validacion.js";
import { router as authRouter } from "./routes/auth.js";
import { router as productosRouter } from "./routes/productos.js";
import { router as pedidosRouter } from "./routes/pedidos.js";
import { router as presupuestosRouter } from "./routes/presupuestos.js";
import { router as fotosRouter } from "./routes/fotos.js";
import { router as usuariosRouter } from "./routes/usuarios.js";
import { limite } from "./middleware/limite.js";

const app = express();

// Render pone un proxy delante de la API. Sin esto, req.ip es la del
// proxy para todos los visitantes, y el limite de intentos los trataria
// como una sola persona: el primero en equivocarse bloquearia a todos.
app.set("trust proxy", 1);

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

app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada." }));

// Manejador de errores unico. Nunca devuelve el stack al cliente:
// los detalles internos van al log del servidor y nada mas.
app.use((err, _req, res, _next) => {
  if (err?.name === "ZodError") {
    return res.status(400).json({
      error: "Datos invalidos.",
      detalles: err.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })),
    });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "El envio es demasiado pesado. Proba con fotos mas livianas." });
  }
  if (err?.status) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

app.listen(PORT, () => {
  console.log(`YosiArt API escuchando en el puerto ${PORT}`);
});
