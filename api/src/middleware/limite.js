// Limite de intentos por ventana de tiempo.
//
// Guarda los contadores en memoria. En Cloudflare cada copia del worker
// lleva su propia cuenta, asi que el freno es aproximado: igual corta a
// quien insiste desde una misma conexion, que es el caso que importa.

// La IP real del visitante.
// Cloudflare manda la IP verdadera en CF-Connecting-IP, y pisa cualquier
// valor que intente mandar el cliente, asi que no se puede falsificar.
export const ipReal = (req) => req.get("cf-connecting-ip") || req.ip;

export function limite({ ventanaMs, max, mensaje, clave = ipReal }) {
  const registros = new Map();

  // Limpieza: sin esto el Map crece para siempre con cada IP que alguna
  // vez paso. Se hace de vez en cuando al recibir un pedido, y no con un
  // temporizador, porque Cloudflare Workers no permite temporizadores
  // fuera de un pedido.
  let ultimaLimpieza = Date.now();
  const limpiar = (ahora) => {
    if (ahora - ultimaLimpieza < ventanaMs) return;
    ultimaLimpieza = ahora;
    for (const [k, v] of registros) {
      if (v.reinicia <= ahora) registros.delete(k);
    }
  };

  return (req, res, next) => {
    const k = clave(req);
    // Sin clave (por ejemplo, un email vacio) no hay nada que contar:
    // la validacion de la ruta se encarga de rechazarlo.
    if (!k) return next();

    const ahora = Date.now();
    limpiar(ahora);
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
