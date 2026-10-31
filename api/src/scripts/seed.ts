import "dotenv/config";
import { hashPassword } from "../lib/claves.ts";
import { pool } from "../db.ts";

// Piezas iniciales: las mismas que muestra la tienda (src/data/piezas.js
// del frontend). Se cargan solo si no existen, asi que correr el seed de
// nuevo no pisa los precios que Yosi haya cambiado desde el panel.
// precio null = "precio a confirmar". TODO: cargar los precios reales.

const CHAPITA_TAMANOS = {
  hueso: [
    { id: "grande", nombre: "Grande", cm: 6 },
    { id: "chico", nombre: "Chico", cm: 4.5 },
  ],
  circulo: [
    { id: "grande", nombre: "Grande", cm: 5 },
    { id: "mediano", nombre: "Mediano", cm: 4 },
    { id: "chico", nombre: "Chico", cm: 3 },
  ],
  pescado: [
    { id: "grande", nombre: "Grande", cm: 5.5 },
    { id: "chico", nombre: "Chico", cm: 4 },
  ],
  gato: [
    { id: "grande", nombre: "Grande", cm: 5 },
    { id: "mediano", nombre: "Mediano", cm: 4 },
    { id: "chico", nombre: "Chico", cm: 3 },
  ],
};

const productos = [
  {
    slug: "chapita-mascota",
    nombre: "Chapita para mascota",
    categoria: "mascotas",
    descripcion: "Hueso, círculo, pescadito o gatito, con nombre y teléfono.",
    forma: "hueso",
    formas: ["hueso", "circulo", "pescado", "gato"],
    tamanos: CHAPITA_TAMANOS,
    lleva: { nombre: true, telefono: true, telefonoAtras: true, foto: false },
    nuevo: true,
    orden: 1,
  },
  {
    slug: "llavero-corazon-foto",
    nombre: "Llavero corazón con foto",
    categoria: "llaveros",
    descripcion: "La foto de tu mascota o de quien quieras, dentro de la resina.",
    forma: "corazon",
    lleva: { nombre: true, telefono: false, telefonoAtras: false, foto: true },
    orden: 2,
  },
  {
    slug: "llavero-huellita",
    nombre: "Llavero huellita",
    categoria: "llaveros",
    descripcion: "Fondo del color que elijas con huellita y nombre.",
    forma: "huellita",
    lleva: { nombre: true, telefono: true, telefonoAtras: false, foto: false },
    orden: 3,
  },
  {
    slug: "posavasos",
    nombre: "Posavasos personalizado",
    categoria: "deco",
    descripcion: "Juego de 2, con el nombre o la inicial que quieras.",
    forma: "posavasos",
    lleva: { nombre: true, telefono: false, telefonoAtras: false, foto: false },
    orden: 4,
  },
];

let nuevos = 0;
for (const p of productos) {
  const { rowCount } = await pool.query(
    `INSERT INTO productos (slug, nombre, categoria, descripcion, precio, forma, formas, tamanos, lleva, nuevo, orden)
     VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (slug) DO NOTHING`,
    [p.slug, p.nombre, p.categoria, p.descripcion, p.forma, JSON.stringify(p.formas ?? []),
     JSON.stringify(p.tamanos ?? {}), JSON.stringify(p.lleva), p.nuevo ?? false, p.orden]
  );
  nuevos += rowCount ?? 0;
}
console.log(nuevos ? `${nuevos} piezas cargadas.` : "Las piezas ya estaban cargadas, no se toco nada.");

// El admin se crea con credenciales que vienen del entorno.
// Nunca hardcodear una contrasena de admin en el repositorio.
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.log("\nPara crear el admin, corre el script con estas variables:");
  console.log('  ADMIN_EMAIL=tu@email.com ADMIN_PASSWORD="una-clave-larga" npm run db:seed\n');
} else if (password.length < 10) {
  console.log("La contrasena del admin debe tener al menos 10 caracteres.");
} else {
  const hash = await hashPassword(password);
  await pool.query(
    `INSERT INTO usuarios (nombre, email, telefono, password_hash, rol)
     VALUES ('YosiArt', $1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, rol = 'admin'`,
    [email.toLowerCase(), process.env.ADMIN_TELEFONO ?? "", hash]
  );
  console.log(`Admin listo: ${email}`);
}

await pool.end();
