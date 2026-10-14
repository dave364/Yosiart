// Worker de YosiArt.
// - fetch: sirve la tienda (los archivos de /dist) como siempre.
// - scheduled: cada 10 minutos le pega a la API para que Render no la duerma.
//   Antes lo hacia una tarea de GitHub Actions, pero GitHub la corria
//   cada 4 o 5 horas en vez de cada 10 minutos.

const API_HEALTH = "https://yosiart-api.onrender.com/api/health";

export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      fetch(API_HEALTH, { headers: { "User-Agent": "yosiart-keepalive" } })
        .then((r) => console.log("health", r.status))
        .catch((e) => console.log("health error", e.message))
    );
  },
};
