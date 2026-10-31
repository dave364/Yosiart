# YosiArt API

Backend de la tienda YosiArt: cuentas de cliente, piezas personalizables,
pedidos con seguimiento, fotos de los clientes y pedidos de presupuesto.

Node + Express + PostgreSQL. Arrancó como copia de `kenypets-api`: el login,
la recuperación de contraseña, los límites de intentos y el envío de correos
son los mismos. Lo propio de YosiArt es la personalización de cada pieza.

## Puesta en marcha (en tu PC)

```bash
cd api
npm install
cp .env.example .env
```

Editá `.env` y completá `DATABASE_URL` y `JWT_SECRET`.

Para generar el `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Después, crear las tablas, cargar las piezas y el admin, y arrancar:

```bash
npm run db:setup
ADMIN_EMAIL=tu@email.com ADMIN_PASSWORD="una-clave-larga" npm run db:seed
npm run dev
```

En PowerShell, las variables del seed se pasan así:

```powershell
$env:ADMIN_EMAIL="tu@email.com"; $env:ADMIN_PASSWORD="una-clave-larga"; npm run db:seed
```

Con la API corriendo, `npm run dev` en la raíz levanta la tienda y le manda
las llamadas a `/api` a esta API local.

## Estructura

Organizada en capas: cada pedido entra por una ruta y baja hasta la base.

```
src/
  routes/         qué URL existe y qué middleware usa (sesión, admin)
  controllers/    lee el pedido, valida con el schema y responde
  services/       la lógica del negocio: precios, piezas, correos, fotos
  repositories/   las consultas SQL, una por tabla
  schemas/        validaciones con Zod (campos.js: email, nombre, contraseña)
  middleware/     sesión (auth.js), límite de intentos, manejo de errores
  lib/            utilidades: contraseñas, teléfonos, errores HTTP
  constantes/     colores, glitters, formas y estados del taller
  app.js          arma Express; index.js lo arranca en Node
  db.js, config.js
```

## Pruebas

```bash
npm test                # contra la API en Node
npm test -- --worker    # contra la API dentro de Cloudflare (wrangler dev)
```

Recorren todas las rutas (104 llamadas) contra una base de pruebas local
que se borra en cada corrida (`TEST_DATABASE_URL`, por defecto
`postgres://yosi:yosi@127.0.0.1:5432/yosiart_test`; nunca la de Neon) y un
Brevo falso que guarda los correos. Comparan cada respuesta y cada correo
con `test/esperado.json`: si un cambio altera algo, lo muestran. Cuando el
cambio es a propósito, `npm test -- --guardar` actualiza lo esperado.

## Deploy en Cloudflare

La API se publica junto con la tienda, en el mismo worker
(`worker/index.js`): `/api/...` va a esta API y el resto a la tienda.
Cada push a `main` la publica sola.

- **Base de datos**: Neon (`DATABASE_URL`).
- **Secretos** (Cloudflare → Workers → yosiart → Settings → Variables and
  Secrets, tipo *Secret*): `DATABASE_URL`, `JWT_SECRET`, `BREVO_API_KEY`,
  `MAIL_FROM_EMAIL`, `ADMIN_EMAIL`.
- **Variables comunes**: en `wrangler.jsonc` (`SITIO_URL`, `API_URL`, ...).
- Crear las tablas o el admin se sigue haciendo desde tu PC, con el
  `DATABASE_URL` de producción en `api/.env`: `npm run db:setup` y
  `npm run db:seed`.

Diferencias con un servidor común, ya resueltas en el código:
- Cada pedido abre y cierra sus propias conexiones a la base (`src/db.js`).
- Las contraseñas usan PBKDF2 nativo (`src/lib/claves.js`); las cuentas viejas con
  bcrypt se pasan solas al formato nuevo en su próximo login.
- Los correos se terminan de mandar después de responder gracias a
  `waitUntil` (`src/services/mail.service.js` + `worker/index.js`).
- Las fotos se guardan como `/api/fotos/<id>`, sin dominio.

## Endpoints

### Autenticación — `/api/auth`

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| POST | `/registro` | público | Crea la cuenta y devuelve un token |
| POST | `/login` | público | Inicia sesión |
| GET | `/me` | con sesión | Datos del usuario actual |
| POST | `/recuperar` | público | Manda el enlace para cambiar la contraseña |
| POST | `/restablecer` | público | Cambia la contraseña con el token del enlace |

### Piezas — `/api/productos`

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/` | público | Piezas activas, con formas, tamaños y qué datos lleva cada una |
| GET | `/todos` | admin | Incluye las desactivadas |
| POST | `/` | admin | Crea una pieza |
| PUT | `/:id` | admin | Edita una pieza (precios incluidos) |
| DELETE | `/:id` | admin | La desactiva (no la borra) |

### Pedidos — `/api/pedidos`

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| POST | `/` | público | Crea un pedido, con o sin sesión |
| GET | `/mis` | con sesión | Pedidos del cliente, con su historial |
| GET | `/seguimiento?numero=&email=` | público | Un pedido, si el número y el email coinciden |
| GET | `/` | admin | Todos los pedidos (`?estado=pendiente`) |
| PATCH | `/:id/estado` | admin | Avanza el pedido y le avisa al cliente por correo |
| PATCH | `/:id/total` | admin | Carga el total de un pedido con precio a confirmar |

Estados: `pendiente` (recibido) → `confirmado` → `en_preparacion` → `listo`
→ `enviado` → `entregado`, y `cancelado` en cualquier momento.

### Presupuestos — `/api/presupuestos`

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| POST | `/` | público | Pedido de presupuesto, con hasta 3 imágenes |
| GET | `/` | admin | Todos (`?estado=nuevo`) |
| PATCH | `/:id` | admin | Responde: estado, texto y precio (el texto le llega por correo) |

### Otros

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/api/fotos/:id` | con el enlace | Una foto que mandó un cliente |
| GET | `/api/usuarios` | admin | Clientes con sus pedidos y lo gastado |
| PATCH | `/api/usuarios/:id/activo` | admin | Suspende o reactiva una cuenta |
| GET | `/api/health` | público | Para el keep-alive |

## Decisiones importantes

**Los precios y las medidas los pone el servidor.** El carrito manda qué
pieza, cuántas y cómo personalizada. Si el navegador manda un precio o una
medida en cm, se ignoran.

**La personalización se valida contra la pieza.** Una chapita solo acepta
las formas y tamaños del molde, el teléfono solo va en las piezas que lo
llevan y el corazón no entra sin foto. Una pieza mal armada devuelve un 400
que dice qué falta.

**Precio a confirmar.** Una pieza sin precio (`precio = NULL`) se puede
pedir igual: el pedido queda con `total = NULL` y Yosi lo cotiza desde el
panel (`PATCH /:id/total`). El precio puede depender del tamaño:
`precios_tamano = {"chico": 3000, "hueso:grande": 4500}`.

**Las fotos se guardan en la base.** Llegan dentro del pedido, se revisa que
sean imágenes de verdad (no solo que lo digan) y se sirven con un id
aleatorio de 32 caracteres. Dónde se guardan lo decide solo
`src/repositories/fotos.repository.js`: si algún día pesan demasiado, es el
único archivo a cambiar para pasarlas a Cloudinary.

**Seguimiento sin cuenta, pero no de cualquiera.** Para ver un pedido hace
falta el número y el email con el que se hizo, y la consulta tiene límite
de intentos para que no se puedan probar números en masa.

**Sin stock.** Las piezas se hacen a pedido, así que no hay stock que
descontar ni pedidos que vencer (a diferencia de Kenypets).

**Los pedidos guardan copia del nombre, el precio y la personalización.**
Si mañana cambia una pieza, los pedidos anteriores conservan lo que se pidió.
