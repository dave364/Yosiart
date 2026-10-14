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

Para que la tienda use esta API en vez de la publicada, en la raíz del
proyecto creá un archivo `.env` con `VITE_API_URL=http://localhost:3000`.

## Deploy en Render

1. **Base de datos**: creá un PostgreSQL (en Render o en Neon) y copiá su
   *External Database URL*.
2. **Servicio**: *New → Web Service*, elegí el repo `Yosiart` y configurá:
   - **Root Directory**: `api`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Name**: `yosiart-api` (así queda en `yosiart-api.onrender.com`, que es
     la dirección que usan la tienda y el keep-alive)
3. **Variables de entorno**: las de `.env.example`, con
   `ORIGENES_PERMITIDOS` y `SITIO_URL` apuntando a la dirección real de la
   tienda, y `API_URL=https://yosiart-api.onrender.com`.
4. Una sola vez, desde tu PC con el `DATABASE_URL` de producción en `.env`:
   `npm run db:setup` y `npm run db:seed` (con el email y la clave del admin).

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
aleatorio de 32 caracteres. Todo eso vive en `src/fotos.js`: si algún día
pesan demasiado, es el único archivo a cambiar para pasarlas a Cloudinary.

**Seguimiento sin cuenta, pero no de cualquiera.** Para ver un pedido hace
falta el número y el email con el que se hizo, y la consulta tiene límite
de intentos para que no se puedan probar números en masa.

**Sin stock.** Las piezas se hacen a pedido, así que no hay stock que
descontar ni pedidos que vencer (a diferencia de Kenypets).

**Los pedidos guardan copia del nombre, el precio y la personalización.**
Si mañana cambia una pieza, los pedidos anteriores conservan lo que se pidió.
