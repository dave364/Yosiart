// Recorrido completo de la API: cada ruta, con los casos que salen bien y
// los que tienen que fallar. Devuelve la lista de pasos (respuesta de cada
// llamada) y cuenta los controles que no se cumplieron.
//
// Lo usa test/correr.js, que prepara una base limpia, levanta la API y
// compara el resultado con test/esperado.json.

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function correrEscenario({ base, mails, sql }) {
  const pasos = [];
  const fallas = [];
  let ip = 0;

  // Cada llamada sale de una "conexion" distinta, salvo que se pida una fija:
  // asi los limites de intentos no se mezclan entre pasos.
  async function llamar(nombre, metodo, ruta, { token, body, ipFija, headers = {}, crudo } = {}) {
    ip += 1;
    const h = {
      "CF-Connecting-IP": ipFija || `10.0.${Math.floor(ip / 250)}.${ip % 250}`,
      ...headers,
    };
    if (token) h.Authorization = `Bearer ${token}`;
    let cuerpo;
    if (crudo !== undefined) {
      cuerpo = crudo;
      h["Content-Type"] = "application/json";
    } else if (body !== undefined) {
      cuerpo = JSON.stringify(body);
      h["Content-Type"] = "application/json";
    }
    const r = await fetch(base + ruta, { method: metodo, headers: h, body: cuerpo });
    const tipo = r.headers.get("content-type") || "";
    let respuesta;
    if (tipo.includes("application/json")) respuesta = await r.json();
    else if (tipo.startsWith("image/")) respuesta = { bytes: (await r.arrayBuffer()).byteLength };
    else respuesta = (await r.text()).slice(0, 80);
    const paso = {
      paso: nombre,
      status: r.status,
      body: respuesta,
      ...(tipo.startsWith("image/") && { tipo }),
      ...(r.headers.get("retry-after") && { retryAfter: true }),
      ...(headers.Origin && { cors: r.headers.get("access-control-allow-origin") }),
    };
    pasos.push(paso);
    return paso;
  }

  const controlar = (condicion, que) => {
    if (!condicion) fallas.push(que);
  };

  // ---------- Generales ----------
  controlar((await llamar("health", "GET", "/api/health")).status === 200, "health");
  controlar((await llamar("ruta inexistente", "GET", "/api/nada")).status === 404, "404");
  controlar((await llamar("json roto", "POST", "/api/auth/login", { crudo: "{malo" })).status === 400, "json roto");
  controlar(
    (await llamar("cuerpo muy grande", "POST", "/api/auth/login", { body: { email: "x".repeat(200_000) } })).status === 413,
    "413"
  );
  const cors1 = await llamar("cors permitido", "GET", "/api/health", { headers: { Origin: "http://localhost:5173" } });
  controlar(cors1.cors === "http://localhost:5173", "cors permitido");
  const cors2 = await llamar("cors ajeno", "GET", "/api/health", { headers: { Origin: "https://otro.com" } });
  controlar(cors2.cors === null, "cors ajeno");

  // ---------- Cuentas ----------
  const admin = await llamar("login admin", "POST", "/api/auth/login", {
    body: { email: "admin@prueba.com", password: "AdminPrueba123" },
  });
  controlar(admin.status === 200 && admin.body.usuario.rol === "admin", "login admin");
  const A = admin.body.token;

  const reg = await llamar("registro", "POST", "/api/auth/registro", {
    body: { nombre: "Ana Prueba", email: "Ana@Prueba.com", telefono: "11 2345-6789", password: "ClaveNueva123" },
  });
  controlar(reg.status === 201 && reg.body.usuario.email === "ana@prueba.com", "registro");
  const C = reg.body.token;
  controlar(
    (await llamar("registro repetido", "POST", "/api/auth/registro", {
      body: { nombre: "Ana Prueba", email: "ana@prueba.com", telefono: "1123456789", password: "ClaveNueva123" },
    })).status === 409,
    "registro repetido"
  );
  controlar(
    (await llamar("registro invalido", "POST", "/api/auth/registro", {
      body: { nombre: "A", email: "mal", telefono: "12", password: "Corta1234" },
    })).status === 400,
    "registro invalido"
  );
  controlar(
    (await llamar("login ok", "POST", "/api/auth/login", { body: { email: "ana@prueba.com", password: "ClaveNueva123" } }))
      .status === 200,
    "login ok"
  );
  controlar(
    (await llamar("login clave mala", "POST", "/api/auth/login", { body: { email: "ana@prueba.com", password: "Otra123456" } }))
      .status === 401,
    "login clave mala"
  );
  controlar(
    (await llamar("login inexistente", "POST", "/api/auth/login", { body: { email: "nadie@prueba.com", password: "Otra123456" } }))
      .status === 401,
    "login inexistente"
  );
  controlar(
    (await llamar("login sin datos", "POST", "/api/auth/login", { body: {} })).status === 400,
    "login sin datos"
  );
  controlar(
    (await llamar("login cuenta bcrypt", "POST", "/api/auth/login", { body: { email: "viejo@prueba.com", password: "ViejaClave123" } }))
      .status === 200,
    "login bcrypt"
  );
  const hashViejo = await sql("SELECT password_hash FROM usuarios WHERE email = 'viejo@prueba.com'");
  controlar(hashViejo[0].password_hash.startsWith("pbkdf2$25000$"), "bcrypt migrado a pbkdf2");
  controlar(
    (await llamar("login cuenta 100k", "POST", "/api/auth/login", { body: { email: "cienmil@prueba.com", password: "ClaveCienMil123" } }))
      .status === 200,
    "login 100k"
  );
  const hashCien = await sql("SELECT password_hash FROM usuarios WHERE email = 'cienmil@prueba.com'");
  controlar(hashCien[0].password_hash.startsWith("pbkdf2$25000$"), "100k migrado a 25k");

  controlar((await llamar("me", "GET", "/api/auth/me", { token: C })).status === 200, "me");
  controlar((await llamar("me sin token", "GET", "/api/auth/me")).status === 401, "me sin token");
  controlar((await llamar("me token falso", "GET", "/api/auth/me", { token: "abc.def.ghi" })).status === 401, "me token falso");

  // Recuperar contraseña: responde igual exista o no la cuenta.
  controlar(
    (await llamar("recuperar existente", "POST", "/api/auth/recuperar", { body: { email: "ana@prueba.com" } })).status === 200,
    "recuperar"
  );
  controlar(
    (await llamar("recuperar inexistente", "POST", "/api/auth/recuperar", { body: { email: "nadie@prueba.com" } })).status === 200,
    "recuperar inexistente"
  );
  const mailReset = await mails.esperar((m) => m.to === "ana@prueba.com" && /#reset=/.test(m.html));
  const tokenReset = mailReset?.html.match(/#reset=([a-f0-9]{64})/)?.[1];
  controlar(!!tokenReset, "mail de reset con enlace");
  controlar(
    (await llamar("restablecer", "POST", "/api/auth/restablecer", { body: { token: tokenReset, password: "ClaveCambiada123" } }))
      .status === 200,
    "restablecer"
  );
  controlar(
    (await llamar("restablecer reusado", "POST", "/api/auth/restablecer", { body: { token: tokenReset, password: "ClaveCambiada456" } }))
      .status === 400,
    "restablecer reusado"
  );
  controlar(
    (await llamar("restablecer token corto", "POST", "/api/auth/restablecer", { body: { token: "abc", password: "ClaveCambiada456" } }))
      .status === 400,
    "restablecer token corto"
  );
  controlar(
    (await llamar("login con clave nueva", "POST", "/api/auth/login", { body: { email: "ana@prueba.com", password: "ClaveCambiada123" } }))
      .status === 200,
    "login clave nueva"
  );

  // ---------- Productos ----------
  const prods = await llamar("productos", "GET", "/api/productos");
  controlar(prods.status === 200 && prods.body.length === 4, "productos");
  const porSlug = Object.fromEntries(prods.body.map((p) => [p.slug, p]));
  controlar((await llamar("productos todos sin token", "GET", "/api/productos/todos")).status === 401, "todos 401");
  controlar((await llamar("productos todos cliente", "GET", "/api/productos/todos", { token: C })).status === 403, "todos 403");
  controlar((await llamar("productos todos admin", "GET", "/api/productos/todos", { token: A })).status === 200, "todos admin");

  // Precios de las chapitas por forma y tamaño, como se cargan desde el panel.
  const chapita = porSlug["chapita-mascota"];
  const edicion = {
    ...chapita,
    precio: null,
    precios_tamano: { "hueso:grande": 20000, "hueso:chico": 17000, "circulo:grande": 18500 },
  };
  delete edicion.id;
  controlar(
    (await llamar("editar precios chapita", "PUT", `/api/productos/${chapita.id}`, { token: A, body: edicion })).status === 200,
    "editar producto"
  );
  const llavero = porSlug["llavero-corazon-foto"];
  const edLlavero = { ...llavero, precio: 9000 };
  delete edLlavero.id;
  controlar(
    (await llamar("precio llavero", "PUT", `/api/productos/${llavero.id}`, { token: A, body: edLlavero })).status === 200,
    "precio llavero"
  );
  controlar(
    (await llamar("editar inexistente", "PUT", "/api/productos/9999", { token: A, body: edLlavero })).status === 404,
    "editar 404"
  );
  controlar(
    (await llamar("editar slug repetido", "PUT", `/api/productos/${llavero.id}`, {
      token: A,
      body: { ...edLlavero, slug: "posavasos" },
    })).status === 409,
    "editar 409"
  );
  controlar(
    (await llamar("editar como cliente", "PUT", `/api/productos/${llavero.id}`, { token: C, body: edLlavero })).status === 403,
    "editar 403"
  );
  const nueva = await llamar("crear producto", "POST", "/api/productos", {
    token: A,
    body: { slug: "iman-prueba", nombre: "Imán de prueba", categoria: "deco", forma: "circulo", precio: 5000 },
  });
  controlar(nueva.status === 201, "crear producto");
  controlar(
    (await llamar("crear slug repetido", "POST", "/api/productos", {
      token: A,
      body: { slug: "iman-prueba", nombre: "Otro", categoria: "deco", forma: "circulo" },
    })).status === 409,
    "crear 409"
  );
  controlar(
    (await llamar("crear invalido", "POST", "/api/productos", {
      token: A,
      body: { slug: "Con Espacios!", nombre: "X", categoria: "d", forma: "estrella" },
    })).status === 400,
    "crear 400"
  );
  controlar((await llamar("productos con el nuevo", "GET", "/api/productos")).body.length === 5, "5 productos");
  controlar(
    (await llamar("desactivar producto", "DELETE", `/api/productos/${nueva.body.id}`, { token: A })).status === 200,
    "desactivar"
  );
  controlar((await llamar("desactivar inexistente", "DELETE", "/api/productos/9999", { token: A })).status === 404, "desactivar 404");
  controlar((await llamar("productos sin el desactivado", "GET", "/api/productos")).body.length === 4, "vuelve a 4");

  // ---------- Pedidos ----------
  const piezaChapita = (extra = {}) => ({
    pieza_id: "chapita-mascota",
    cantidad: 2,
    personalizacion: {
      forma: "hueso",
      tamano: "grande",
      color: "rosa",
      glitter: "dorado",
      nombre: "Luna",
      letra: "negro",
      telefono: "11 2233-4455",
      telefonoLado: "dorso",
      tamanoCm: 99,
      ...extra,
    },
  });
  const piezaLlavero = (extra = {}) => ({
    pieza_id: "llavero-corazon-foto",
    cantidad: 1,
    personalizacion: { color: "lila", glitter: "plateado", nombre: "Miel", foto: PNG, ...extra },
  });
  const cliente = { cliente_nombre: "Ana Prueba", cliente_email: "ana@prueba.com", cliente_telefono: "11 2345-6789" };

  const p1 = await llamar("pedido invitado", "POST", "/api/pedidos", {
    body: { ...cliente, items: [piezaChapita(), piezaLlavero()] },
  });
  controlar(p1.status === 201 && p1.body.total === 49000, "pedido con total calculado");
  controlar(p1.body.items?.[0]?.personalizacion?.tamanoCm === 6, "medida la pone el servidor");
  const fotoUrl = p1.body.items?.[1]?.personalizacion?.foto;
  controlar(/^\/api\/fotos\/[a-f0-9]{32}$/.test(fotoUrl || ""), "foto guardada");

  const p2 = await llamar("pedido con cuenta", "POST", "/api/pedidos", {
    token: C,
    body: {
      ...cliente,
      items: [
        piezaChapita({ forma: "circulo", tamano: "mediano", letra: undefined, telefono: "", telefonoLado: null }),
        { pieza_id: "posavasos", cantidad: 1, personalizacion: { color: "turquesa", nombre: "Casa" } },
      ],
    },
  });
  controlar(p2.status === 201 && p2.body.total === null, "pedido con precio a confirmar");

  const malos = [
    ["pedido forma invalida", [piezaChapita({ forma: "estrella" })]],
    ["pedido tamaño invalido", [piezaChapita({ tamano: "gigante" })]],
    ["pedido sin nombre", [piezaChapita({ nombre: "" })]],
    ["pedido sin foto", [piezaLlavero({ foto: null })]],
    ["pedido foto que no es imagen", [piezaLlavero({ foto: "data:image/png;base64,aG9sYQ==" })]],
    ["pedido telefono malo", [piezaChapita({ telefono: "123" })]],
    ["pedido pieza inexistente", [{ ...piezaChapita(), pieza_id: "no-existe" }]],
    ["pedido pieza desactivada", [{ ...piezaChapita(), pieza_id: "iman-prueba" }]],
    ["pedido color invalido", [piezaChapita({ color: "verde" })]],
    ["pedido letra invalida", [piezaChapita({ letra: "dorado" })]],
    ["pedido sin items", []],
  ];
  for (const [nombre, items] of malos) {
    const r = await llamar(nombre, "POST", "/api/pedidos", { body: { ...cliente, items } });
    controlar(r.status === 400, nombre);
  }
  controlar(
    (await llamar("pedido muy pesado", "POST", "/api/pedidos", {
      body: { ...cliente, items: [piezaLlavero({ foto: "data:image/png;base64," + "A".repeat(9_000_000) })] },
    })).status === 413,
    "pedido 413"
  );

  const foto = await llamar("ver foto", "GET", fotoUrl);
  controlar(foto.status === 200 && foto.tipo === "image/png", "ver foto");
  controlar((await llamar("foto id invalido", "GET", "/api/fotos/xyz")).status === 404, "foto 404 formato");
  controlar((await llamar("foto inexistente", "GET", "/api/fotos/" + "0".repeat(32))).status === 404, "foto 404");

  controlar((await llamar("mis pedidos", "GET", "/api/pedidos/mis", { token: C })).body.length === 1, "mis pedidos");
  controlar((await llamar("mis pedidos sin token", "GET", "/api/pedidos/mis")).status === 401, "mis 401");
  const seg = await llamar("seguimiento", "GET", "/api/pedidos/seguimiento?numero=1&email=ANA@prueba.com");
  controlar(seg.status === 200 && !("cliente_telefono" in seg.body), "seguimiento sin telefono");
  controlar(
    (await llamar("seguimiento email ajeno", "GET", "/api/pedidos/seguimiento?numero=0001&email=otro@prueba.com")).status === 404,
    "seguimiento 404"
  );
  controlar(
    (await llamar("seguimiento numero invalido", "GET", "/api/pedidos/seguimiento?numero=abc&email=ana@prueba.com")).status === 400,
    "seguimiento 400"
  );

  controlar((await llamar("pedidos admin", "GET", "/api/pedidos", { token: A })).body.length === 2, "pedidos admin");
  controlar((await llamar("pedidos admin filtro", "GET", "/api/pedidos?estado=pendiente", { token: A })).status === 200, "filtro");
  controlar((await llamar("pedidos filtro invalido", "GET", "/api/pedidos?estado=volando", { token: A })).status === 400, "filtro 400");
  controlar((await llamar("pedidos como cliente", "GET", "/api/pedidos", { token: C })).status === 403, "pedidos 403");
  controlar(
    (await llamar("cambiar estado", "PATCH", "/api/pedidos/1/estado", { token: A, body: { estado: "confirmado", nota: "¡Arrancamos!" } }))
      .status === 200,
    "cambiar estado"
  );
  controlar(
    (await llamar("cambiar estado inexistente", "PATCH", "/api/pedidos/999/estado", { token: A, body: { estado: "listo" } })).status === 404,
    "estado 404"
  );
  controlar(
    (await llamar("cambiar estado invalido", "PATCH", "/api/pedidos/1/estado", { token: A, body: { estado: "volando" } })).status === 400,
    "estado 400"
  );
  controlar(
    (await llamar("cargar total", "PATCH", "/api/pedidos/2/total", { token: A, body: { total: 12345.678 } })).body.total === 12345.68,
    "cargar total"
  );
  controlar(
    (await llamar("cargar total inexistente", "PATCH", "/api/pedidos/999/total", { token: A, body: { total: 1 } })).status === 404,
    "total 404"
  );
  controlar(
    (await llamar("pedido con historial", "GET", "/api/pedidos/seguimiento?numero=0001&email=ana@prueba.com")).body.historial
      ?.length === 2,
    "historial"
  );

  // ---------- Presupuestos ----------
  const pres = await llamar("presupuesto", "POST", "/api/presupuestos", {
    body: {
      nombre: "Ana Prueba",
      email: "ana@prueba.com",
      telefono: "",
      tipo: "Souvenirs para un evento",
      cantidad: "40",
      fecha: "2026-12-20",
      descripcion: "40 llaveros lila para un cumple de 15",
      fotos: [PNG],
    },
  });
  controlar(pres.status === 201, "presupuesto");
  controlar(
    (await llamar("presupuesto invalido", "POST", "/api/presupuestos", {
      body: { nombre: "Ana", email: "ana@prueba.com", tipo: "Cualquiera", descripcion: "corto" },
    })).status === 400,
    "presupuesto 400"
  );
  const listaPres = await llamar("presupuestos admin", "GET", "/api/presupuestos", { token: A });
  controlar(listaPres.body.length === 1, "presupuestos admin");
  controlar((await llamar("presupuestos filtro", "GET", "/api/presupuestos?estado=nuevo", { token: A })).body.length === 1, "filtro pres");
  controlar((await llamar("presupuestos como cliente", "GET", "/api/presupuestos", { token: C })).status === 403, "pres 403");
  controlar(
    (await llamar("responder presupuesto", "PATCH", `/api/presupuestos/${pres.body.id}`, {
      token: A,
      body: { estado: "respondido", respuesta: "Te sale $2.500 cada uno.", precio: 100000 },
    })).status === 200,
    "responder"
  );
  controlar(
    (await llamar("presupuesto aceptado sin respuesta", "PATCH", `/api/presupuestos/${pres.body.id}`, {
      token: A,
      body: { estado: "aceptado" },
    })).body.precio === 100000,
    "aceptado conserva precio"
  );
  controlar(
    (await llamar("responder inexistente", "PATCH", "/api/presupuestos/999", { token: A, body: { estado: "rechazado" } })).status === 404,
    "pres 404"
  );

  // ---------- Clientes ----------
  const clientes = await llamar("clientes", "GET", "/api/usuarios", { token: A });
  controlar(clientes.status === 200, "clientes");
  const ana = clientes.body.find((u) => u.email === "ana@prueba.com");
  controlar(ana?.pedidos === 1 && ana?.gastado === 12345.68, "clientes con totales");
  controlar((await llamar("clientes como cliente", "GET", "/api/usuarios", { token: C })).status === 403, "clientes 403");
  controlar(
    (await llamar("suspender", "PATCH", `/api/usuarios/${ana.id}/activo`, { token: A, body: { activo: false } })).status === 200,
    "suspender"
  );
  controlar(
    (await llamar("login suspendido", "POST", "/api/auth/login", { body: { email: "ana@prueba.com", password: "ClaveCambiada123" } }))
      .status === 403,
    "login suspendido"
  );
  controlar(
    (await llamar("pedido suspendido", "POST", "/api/pedidos", { token: C, body: { ...cliente, items: [piezaChapita()] } })).status === 403,
    "pedido suspendido"
  );
  controlar(
    (await llamar("reactivar", "PATCH", `/api/usuarios/${ana.id}/activo`, { token: A, body: { activo: true } })).status === 200,
    "reactivar"
  );
  controlar(
    (await llamar("suspenderse a si mismo", "PATCH", `/api/usuarios/${admin.body.usuario.id}/activo`, { token: A, body: { activo: false } }))
      .status === 400,
    "autosuspension"
  );
  controlar(
    (await llamar("suspender inexistente", "PATCH", "/api/usuarios/999/activo", { token: A, body: { activo: false } })).status === 404,
    "suspender 404"
  );

  // ---------- Limites de intentos ----------
  let ultimo;
  for (let i = 0; i < 11; i++) {
    ultimo = await llamar(`login repetido ${i + 1}`, "POST", "/api/auth/login", {
      ipFija: "9.9.9.9",
      body: { email: "x@prueba.com", password: "Mala123456" },
    });
  }
  controlar(ultimo.status === 429 && ultimo.retryAfter, "limite login");
  for (let i = 0; i < 4; i++) {
    ultimo = await llamar(`recuperar repetido ${i + 1}`, "POST", "/api/auth/recuperar", { body: { email: "repetido@prueba.com" } });
  }
  controlar(ultimo.status === 429, "limite recuperar por email");

  return { pasos, fallas };
}
