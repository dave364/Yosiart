// Worker de YosiArt: la tienda y la API en un solo lugar, gratis y sin
// que se "duerma".
// - /api/...  → la API (Express, la misma de la carpeta api/).
// - todo lo demás → la tienda (los archivos de /dist).
//
// Antes la API estaba en Render. El plan gratis de Render reparte 750
// horas por mes entre todos los servicios, y al mantenerla despierta con
// un ping se gastaron y Render suspendió todo. En Cloudflare no hay límite
// de horas ni hace falta despertarla.

import { httpServerHandler } from "cloudflare:node";
import { waitUntil } from "cloudflare:workers";
import { app } from "../api/src/app.ts";
import { usarSegundoPlano } from "../api/src/services/mail.service.ts";

// Los correos se mandan después de responder: waitUntil le pide a
// Cloudflare que no corte el worker hasta que terminen.
usarSegundoPlano(waitUntil);

app.listen(3000);
const api = httpServerHandler({ port: 3000 });

// httpServerHandler siempre arma el fetch; el tipo lo marca como opcional.
const atenderApi = api.fetch!;

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) return atenderApi(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
