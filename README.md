# YosiArt — tienda de piezas de resina personalizadas

Frontend de la tienda de YosiArt. Usa la misma base que Kenypets
(React + Vite + SCSS, deploy en Cloudflare Workers, API en Render),
con la marca y el contenido de YosiArt.

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera /dist
npm run lint
```

La URL de la API se configura con un archivo `.env`:

```
VITE_API_URL=http://localhost:3000
```

Si no se define, usa `https://yosiart-api.onrender.com` (todavía no existe).

## Páginas

| Ruta | Qué hace |
| --- | --- |
| `/` | Inicio: portada, categorías (filtran el catálogo), más pedidos, cómo pedir, presupuesto |
| `/personalizar?pieza=<id>` | Personalizador con vista previa en vivo: pieza, color, glitter, nombre, teléfono opcional y foto |
| `/carrito` | Carrito con cada pieza personalizada, datos del cliente y confirmación del pedido |
| `/presupuesto` | Formulario para piezas a medida y souvenirs, con imágenes de referencia |
| `/#reset=TOKEN` | Nueva contraseña (viene de Kenypets) |

## Estructura

```
src/
  config.js                 URL de la API e Instagram
  data/piezas.js            catálogo, colores y glitters (hasta que exista la API)
  context/CartContext.jsx   carrito: cada combinación de opciones es un ítem distinto
  context/AuthContext.jsx   login/registro (de Kenypets)
  components/PiezaPreview   dibujo SVG de la pieza (personalizador y carrito)
  components/Navbar, Footer, Icono, Auth, Reset
  pages/Home, Personalizar, Carrito, Presupuesto
  styles/abstracts/_variables.scss   paleta y tipografías de la marca
  utils/foto.js             achica las fotos antes de guardarlas
  utils/telefono.js         validación de teléfonos argentinos (de Kenypets)
```

## Pendientes

- **Contenido**: precios reales (`precio` en `data/piezas.js`), fotos de las piezas, demora (`[X DÍAS]`) y zonas de envío (`[ZONAS]`).
- **Backend** (copia adaptada de `kenypets-api`):
  - `POST /api/pedidos` que acepte `personalizacion` por ítem y el email del cliente.
  - `POST /api/presupuestos`.
  - Subida de fotos a Cloudinary (hoy se guarda una miniatura en el navegador).
  - Estados del pedido y avisos por email.
- **Mi cuenta**: historial y seguimiento de pedidos.
- **Panel de administración** (adaptar el de Kenypets).
- **Mercado Pago**: al final, cuando la página tenga su forma final.
