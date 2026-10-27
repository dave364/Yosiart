# YosiArt — tienda de piezas de resina personalizadas

Frontend de la tienda de YosiArt. Usa la misma base que Kenypets
(React + Vite + SCSS), con la tienda y la API publicadas juntas en
Cloudflare Workers,
con la marca y el contenido de YosiArt.

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera /dist
npm run lint
```

La tienda llama a la API en su misma dirección (`/api/...`). En desarrollo,
Vite manda esas llamadas a la API local (`cd api && npm run dev`, puerto 3000).

Para probar todo junto como en Cloudflare: `npm run build` y después
`npx wrangler dev`, con un archivo `.dev.vars` en la raíz con las mismas
variables que `api/.env`.

## Páginas

| Ruta | Qué hace |
| --- | --- |
| `/` | Inicio: portada, categorías (filtran el catálogo), más pedidos, cómo pedir, presupuesto |
| `/personalizar?pieza=<id>` | Personalizador con vista previa en vivo: pieza, color, glitter, nombre, teléfono opcional y foto |
| `/carrito` | Carrito con cada pieza personalizada, datos del cliente y confirmación del pedido |
| `/presupuesto` | Formulario para piezas a medida y souvenirs, con imágenes de referencia |
| `/seguimiento` | Seguimiento del pedido (con número y email, o "Mis pedidos" con sesión) |
| `/admin` | Panel de YosiArt: pedidos y estados, presupuestos, piezas y precios, clientes (solo cuentas admin) |
| `/#reset=TOKEN` | Nueva contraseña (viene de Kenypets) |

## Estructura

```
src/
  config.js                 URL de la API e Instagram
  data/piezas.js            colores, glitters y catálogo de respaldo (el real viene de la API)
  context/CatalogoContext   piezas y precios desde GET /api/productos
  context/CartContext.jsx   carrito: cada combinación de opciones es un ítem distinto
  context/AuthContext.jsx   login/registro (de Kenypets)
  components/PiezaPreview   dibujo SVG de la pieza (personalizador y carrito)
  components/Navbar, Footer, Icono, Auth, Reset
  pages/Home, Personalizar, Carrito, Presupuesto
  styles/abstracts/_variables.scss   paleta y tipografías de la marca
  utils/foto.js             achica las fotos antes de guardarlas
  utils/telefono.js         validación de teléfonos argentinos (de Kenypets)
```

## Backend

La API está en la carpeta [`api/`](api/README.md): Node + Express + PostgreSQL,
con pedidos, seguimiento, fotos y presupuestos. Para probar la tienda contra
tu API local, creá un `.env` en la raíz con `VITE_API_URL=http://localhost:3000`.

## Pendientes

- **Contenido**: precios reales y medidas exactas (se cargan desde `/admin` → Piezas y precios), fotos de las piezas, demora (`[X DÍAS]`) y zonas de envío (`[ZONAS]`).
- **Mercado Pago**: al final, cuando la página tenga su forma final.
