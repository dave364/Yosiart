// Worker de YosiArt.
// - fetch: sirve la tienda (los archivos de /dist) como siempre.
// - scheduled: cada 10 minutos le pega a la API para que Render no la duerma.
//   No se usa GitHub Actions para esto: el repo es privado y una tarea cada
//   10 minutos gastaria en pocos dias los minutos gratis del mes.

const API_HEALTH = "https://yosiart.onrender.com/api/health";

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
