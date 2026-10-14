// Limite de intentos por ventana de tiempo.
//
// Hecho a mano en vez de usar express-rate-limit: sumar una dependencia
// obliga a regenerar package-lock.json, y si queda desincronizado Render
// no puede instalar y el deploy se cae.
//
// Guarda los contadores en memoria. Alcanza para un solo servidor como
// el de Render; si se reinicia, los contadores arrancan de cero, que
// para esto es aceptable.

// La IP real del visitante.
// Render tiene Cloudflare adelante, asi que req.ip termina siendo la de
// un servidor de Cloudflare, que cambia en cada pedido: cada intento
// parecia de una persona distinta y el contador nunca pasaba de uno.
// Cloudflare manda la IP verdadera en CF-Connecting-IP, y pisa cualquier
// valor que intente mandar el cliente, asi que no se puede falsificar.
export const ipReal = (req) => req.get("cf-connecting-ip") || req.ip;

export function limite({ ventanaMs, max, mensaje, clave = ipReal }) {
  const registros = new Map();

  // Limpieza periodica: sin esto el Map crece para siempre con cada IP
  // que alguna vez paso. unref() evita que este timer mantenga vivo el
  // proceso si todo lo demas termino.
  setInterval(() => {
    const ahora = Date.now();
    for (const [k, v] of registros) {
      if (v.reinicia <= ahora) registros.delete(k);
    }
  }, ventanaMs).unref();

  return (req, res, next) => {
    const k = clave(req);
    // Sin clave (por ejemplo, un email vacio) no hay nada que contar:
    // la validacion de la ruta se encarga de rechazarlo.
    if (!k) return next();

    const ahora = Date.now();
    let r = registros.get(k);
    if (!r || r.reinicia <= ahora) {
      r = { cuenta: 0, reinicia: ahora + ventanaMs };
      registros.set(k, r);
    }

    r.cuenta += 1;

    if (r.cuenta > max) {
      const segundos = Math.ceil((r.reinicia - ahora) / 1000);
      res.set("Retry-After", String(segundos));
      return res.status(429).json({ error: mensaje });
    }

    next();
  };
}
