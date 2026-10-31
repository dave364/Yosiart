// Pruebas de la API de punta a punta.
//
//   npm test                 → contra la API en Node
//   npm test -- --worker     → contra la API dentro de Cloudflare (wrangler dev)
//   npm test -- --guardar    → guarda el resultado como el esperado
//
// Necesita un Postgres local para pruebas (nunca la base real), en
// TEST_DATABASE_URL. Por defecto: postgres://yosi:yosi@127.0.0.1:5432/yosiart_test
//
// Qué hace:
// 1. Borra y vuelve a crear la base de pruebas (tablas + piezas + admin).
// 2. Levanta un Brevo falso que guarda los correos en vez de mandarlos.
// 3. Levanta la API y corre test/escenario.ts (todas las rutas).
// 4. Compara cada respuesta y cada correo con test/esperado.json. Así,
//    después de reorganizar el código, se ve si algo cambió aunque sea
//    una coma.

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import bcrypt from "bcryptjs";
import { correrEscenario } from "./escenario.ts";
import type { Correo, Paso } from "./escenario.ts";
import type { ChildProcess } from "node:child_process";

const aqui = dirname(fileURLToPath(import.meta.url));
const raizApi = join(aqui, "..");
const raizRepo = join(raizApi, "..");
const MODO_WORKER = process.argv.includes("--worker");
const GUARDAR = process.argv.includes("--guardar");

const DB = process.env.TEST_DATABASE_URL || "postgres://yosi:yosi@127.0.0.1:5432/yosiart_test";
if (!/127\.0\.0\.1|localhost/.test(DB)) {
  console.error("TEST_DATABASE_URL tiene que ser una base local: las pruebas la borran entera.");
  process.exit(1);
}

const PUERTO_MAIL = 8999;
const PUERTO_API = MODO_WORKER ? 8790 : 3100;
const entorno = {
  DATABASE_URL: DB,
  PGSSL: "false",
  JWT_SECRET: "clave-de-pruebas-0123456789abcdef0123456789abcdef",
  BREVO_API_KEY: "xkeysib-pruebas",
  BREVO_API_URL: `http://127.0.0.1:${PUERTO_MAIL}/smtp/email`,
  MAIL_FROM_EMAIL: "hola@yosiart.test",
  ADMIN_EMAIL: "admin@prueba.com",
  ADMIN_PASSWORD: "AdminPrueba123",
  SITIO_URL: "https://tienda.test",
  API_URL: "https://tienda.test",
  ORIGENES_PERMITIDOS: "http://localhost:5173",
  PORT: String(PUERTO_API),
};

const ejecutar = (args: string[], cwd: string) =>
  new Promise<string>((ok, mal) => {
    const p = spawn(process.execPath, args, { cwd, env: { ...process.env, ...entorno }, stdio: "pipe" });
    let salida = "";
    p.stdout.on("data", (d: Buffer) => (salida += d));
    p.stderr.on("data", (d: Buffer) => (salida += d));
    p.on("exit", (c: number | null) => (c === 0 ? ok(salida) : mal(new Error(salida))));
  });

// --- 1. Base limpia ---
const pool = new pg.Pool({ connectionString: DB });
const sql = async (texto: string, params?: unknown[]) => (await pool.query(texto, params)).rows;
await sql("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
await ejecutar(["src/scripts/setup.ts"], raizApi);
await ejecutar(["src/scripts/seed.ts"], raizApi);
// Cuentas con formatos de contraseña viejos, para probar que se actualizan
// solas: una con bcrypt y otra con PBKDF2 de 100.000 vueltas.
async function pbkdf2(password: string, vueltas: number): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const b = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: vueltas }, k, 256);
  return `pbkdf2$${vueltas}$${Buffer.from(sal).toString("base64")}$${Buffer.from(b).toString("base64")}`;
}
await sql(
  `INSERT INTO usuarios (nombre, email, telefono, password_hash) VALUES
   ('Cliente Viejo', 'viejo@prueba.com', '1122334455', $1),
   ('Cien Mil', 'cienmil@prueba.com', '1122334455', $2)`,
  [bcrypt.hashSync("ViejaClave123", 10), await pbkdf2("ClaveCienMil123", 100000)]
);

// --- 2. Brevo falso ---
const correos: Correo[] = [];
const servidorMail = createServer((req, res) => {
  let cuerpo = "";
  req.on("data", (d: Buffer) => (cuerpo += d));
  req.on("end", () => {
    const m = JSON.parse(cuerpo);
    correos.push({
      clave: String(req.headers["api-key"]),
      de: m.sender,
      to: m.to[0].email,
      asunto: m.subject,
      html: m.htmlContent,
    });
    res.writeHead(201, { "Content-Type": "application/json" }).end('{"messageId":"x"}');
  });
}).listen(PUERTO_MAIL, "127.0.0.1");

const mails = {
  // Espera a que llegue un correo que cumpla la condición (se mandan después de responder).
  async esperar(cond: (m: Correo) => boolean, ms = 5000): Promise<Correo | null> {
    const fin = Date.now() + ms;
    while (Date.now() < fin) {
      const m = correos.find(cond);
      if (m) return m;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  },
};

// --- 3. API ---
let api: ChildProcess;
if (MODO_WORKER) {
  const vars = Object.entries(entorno).flatMap(([k, v]) => ["--var", `${k}:${v}`]);
  api = spawn("npx", ["wrangler", "dev", "--port", String(PUERTO_API), "--ip", "127.0.0.1", ...vars], {
    cwd: raizRepo,
    env: { ...process.env, CLOUDFLARE_ENV: "" },
    stdio: "pipe",
  });
} else {
  api = spawn(process.execPath, ["src/index.ts"], { cwd: raizApi, env: { ...process.env, ...entorno }, stdio: "pipe" });
}
let logApi = "";
api.stdout?.on("data", (d: Buffer) => (logApi += d));
api.stderr?.on("data", (d: Buffer) => (logApi += d));
const base = `http://127.0.0.1:${PUERTO_API}`;
const terminar = (codigo: number): never => {
  api.kill();
  servidorMail.close();
  pool.end();
  process.exit(codigo);
};

for (let i = 0; ; i++) {
  try {
    if ((await fetch(base + "/api/health")).ok) break;
  } catch {
    /* todavía arrancando */
  }
  if (i > 120) {
    console.error("La API no arrancó:\n" + logApi);
    terminar(1);
  }
  await new Promise((r) => setTimeout(r, 500));
}

// --- 4. Escenario y comparación ---
let resultado: { pasos: Paso[]; correos: Correo[] };
try {
  const { pasos, fallas } = await correrEscenario({ base, mails, sql });
  await new Promise((r) => setTimeout(r, 1500)); // últimos correos en segundo plano

  // Lo que cambia en cada corrida (tokens, fechas, ids de fotos) se reemplaza
  // por marcas fijas para poder comparar.
  const limpiar = <T>(v: T): T =>
    JSON.parse(
      JSON.stringify(v)
        .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<jwt>")
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/g, "<fecha>")
        .replace(/[a-f0-9]{64}/g, "<token>")
        .replace(/\/api\/fotos\/[a-f0-9]{32}/g, "/api/fotos/<foto>")
    );
  const correosOrdenados = limpiar(correos).sort((a, b) =>
    (a.to + a.asunto + a.html).localeCompare(b.to + b.asunto + b.html)
  );
  resultado = { pasos: limpiar(pasos), correos: correosOrdenados };

  console.log(`${pasos.length} llamadas a la API, ${correos.length} correos.`);
  if (fallas.length) {
    console.log(`\n✘ ${fallas.length} controles fallaron:`);
    for (const f of fallas) console.log("  - " + f);
  } else {
    console.log("✔ Todos los controles pasaron.");
  }

  const archivo = join(aqui, "esperado.json");
  if (GUARDAR) {
    await writeFile(archivo, JSON.stringify(resultado, null, 2) + "\n");
    console.log("Guardado como esperado: test/esperado.json");
    terminar(fallas.length ? 1 : 0);
  }

  const esperado: typeof resultado = JSON.parse(await readFile(archivo, "utf8"));
  const diferencias = [];
  const largo = Math.max(esperado.pasos.length, resultado.pasos.length);
  for (let i = 0; i < largo; i++) {
    const a = JSON.stringify(esperado.pasos[i]);
    const b = JSON.stringify(resultado.pasos[i]);
    if (a !== b) diferencias.push(`Paso "${esperado.pasos[i]?.paso ?? resultado.pasos[i]?.paso}":\n    antes: ${a}\n    ahora: ${b}`);
  }
  if (JSON.stringify(esperado.correos) !== JSON.stringify(resultado.correos)) {
    diferencias.push(`Correos distintos (${esperado.correos.length} antes, ${resultado.correos.length} ahora).`);
  }
  if (diferencias.length) {
    console.log(`\n✘ ${diferencias.length} diferencias con test/esperado.json:`);
    for (const d of diferencias.slice(0, 15)) console.log("  " + d.slice(0, 600));
    await writeFile(join(aqui, "resultado.json"), JSON.stringify(resultado, null, 2) + "\n");
    console.log("\nEl resultado completo quedó en test/resultado.json.");
  } else {
    console.log("✔ Respuestas y correos idénticos a test/esperado.json.");
  }
  terminar(fallas.length || diferencias.length ? 1 : 0);
} catch (err) {
  console.error(err, "\n--- log de la API ---\n" + logApi.slice(-3000));
  terminar(1);
}
