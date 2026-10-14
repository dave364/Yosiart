import { Router } from "express";
import { z } from "zod";
import { emailCampo, nombreCampo } from "../validacion.js";
import { query, withTransaction } from "../db.js";
import { autenticacionOpcional, requiereAuth, requiereAdmin } from "../middleware/auth.js";
import { mailResumenPedido, mailCambioEstado, enviarEnSegundoPlano, avisarPedidoNuevo } from "../mail.js";
import { telefonoValido, normalizarTelefono } from "../telefono.js";
import { COLORES, GLITTERS, MAX_NOMBRE, ESTADOS_PEDIDO } from "../catalogo.js";
import { guardarFoto, esDataUrl } from "../fotos.js";

export const router = Router();

const telefonoCliente = z
  .string()
  .trim()
  .refine(telefonoValido, "El teléfono tiene que tener 10 dígitos, con el código de área")
  .transform(normalizarTelefono);

// Lo que el cliente eligio para cada pieza. Los campos que no estan aca
// (por ejemplo tamanoCm) se descartan: la medida la pone el servidor.
const personalizacionSchema = z.object({
  forma: z.string().trim().max(30).nullish(),
  tamano: z.string().trim().max(30).nullish(),
  color: z.enum(Object.keys(COLORES)),
  glitter: z.enum(Object.keys(GLITTERS)).default("sin"),
  nombre: z.string().trim().max(MAX_NOMBRE).default(""),
  telefono: z.string().trim().max(20).nullish(),
  telefonoLado: z.enum(["frente", "dorso"]).nullish(),
  foto: z.string().max(3_000_000).nullish(),
});

// El cliente manda QUE pieza quiere, CUANTAS y COMO personalizada,
// nunca a que precio. El precio lo decide el servidor.
const pedidoSchema = z.object({
  cliente_nombre: nombreCampo,
  cliente_email: emailCampo,
  cliente_telefono: telefonoCliente,
  items: z
    .array(
      z.object({
        pieza_id: z.string().trim().min(1).max(60),
        cantidad: z.coerce.number().int().min(1).max(50),
        personalizacion: personalizacionSchema,
      })
    )
    .min(1)
    .max(30),
});

const estadoSchema = z.object({
  estado: z.enum(Object.keys(ESTADOS_PEDIDO)),
  nota: z.string().trim().max(500).optional(),
});

const totalSchema = z.object({ total: z.coerce.number().nonnegative() });

const redondear = (n) => Math.round(n * 100) / 100;

function invalido(mensaje, status = 400) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

// Revisa la personalizacion contra lo que la pieza permite y devuelve
// la version limpia, con la medida y el precio que decide el servidor.
function validarPieza(producto, p) {
  const nombrePieza = producto.nombre;
  const lleva = producto.lleva || {};

  // Forma: si la pieza tiene varias (las chapitas), tiene que ser una de esas.
  const permitidas = producto.formas?.length ? producto.formas : [producto.forma];
  const forma = p.forma || permitidas[0];
  if (!permitidas.includes(forma)) throw invalido(`"${nombrePieza}" no viene en esa forma.`);

  // Tamaño: solo si la forma tiene tamaños cargados.
  const tamanos = producto.tamanos?.[forma];
  let tamano = null;
  if (tamanos?.length) {
    tamano = tamanos.find((t) => t.id === (p.tamano || tamanos[0].id));
    if (!tamano) throw invalido(`"${nombrePieza}" no viene en ese tamaño.`);
  }

  const nombre = lleva.nombre ? p.nombre : "";
  if (lleva.nombre && !nombre) throw invalido(`Falta el nombre que va en "${nombrePieza}".`);

  const telefono = lleva.telefono && p.telefono ? p.telefono : null;
  if (telefono && !telefonoValido(telefono)) {
    throw invalido(`El teléfono de "${nombrePieza}" tiene que tener 10 dígitos con el código de área.`);
  }
  const telefonoLado = telefono ? (lleva.telefonoAtras ? p.telefonoLado || "dorso" : "frente") : null;

  const foto = lleva.foto ? p.foto : null;
  if (lleva.foto && !esDataUrl(foto)) throw invalido(`Falta la foto que va en "${nombrePieza}".`);

  // Precio: el del tamaño si hay uno cargado, si no el de la pieza.
  const pt = producto.precios_tamano || {};
  const precioCrudo = (tamano && (pt[`${forma}:${tamano.id}`] ?? pt[tamano.id])) ?? producto.precio;
  const precio = precioCrudo == null ? null : Number(precioCrudo);

  return {
    precio,
    personalizacion: {
      forma,
      tamano: tamano?.id ?? null,
      tamanoNombre: tamano?.nombre ?? null,
      tamanoCm: tamano?.cm ?? null,
      color: p.color,
      glitter: p.glitter,
      nombre,
      telefono,
      telefonoLado,
      foto,
    },
  };
}

// Trae pedidos completos (con sus piezas y su historial) para una condicion.
async function cargarPedidos(donde, params) {
  const { rows } = await query(
    `SELECT p.id, p.numero, p.usuario_id, p.cliente_nombre, p.cliente_email, p.cliente_telefono,
            p.estado, p.total, p.creado_en, p.actualizado_en,
            COALESCE((SELECT json_agg(json_build_object(
                        'nombre', i.nombre_producto,
                        'precio_unitario', i.precio_unitario,
                        'cantidad', i.cantidad,
                        'personalizacion', i.personalizacion) ORDER BY i.id)
                        FROM pedido_items i WHERE i.pedido_id = p.id), '[]') AS items,
            COALESCE((SELECT json_agg(json_build_object(
                        'estado', h.estado, 'nota', h.nota, 'fecha', h.creado_en) ORDER BY h.creado_en, h.id)
                        FROM pedido_historial h WHERE h.pedido_id = p.id), '[]') AS historial
       FROM pedidos p
      WHERE ${donde}
      ORDER BY p.creado_en DESC`,
    params
  );
  return rows.map((p) => ({ ...p, total: p.total == null ? null : Number(p.total) }));
}

router.post("/", autenticacionOpcional, async (req, res, next) => {
  try {
    const datos = pedidoSchema.parse(req.body);
    const slugs = [...new Set(datos.items.map((i) => i.pieza_id))];

    const resultado = await withTransaction(async (client) => {
      const { rows: productos } = await client.query(
        `SELECT id, slug, nombre, precio, precios_tamano, forma, formas, tamanos, lleva
           FROM productos
          WHERE slug = ANY($1::text[]) AND activo = TRUE`,
        [slugs]
      );
      const porSlug = new Map(productos.map((p) => [p.slug, p]));

      // Primero se valida todo; las fotos se guardan recien cuando el
      // pedido entero esta bien.
      const items = datos.items.map((item) => {
        const producto = porSlug.get(item.pieza_id);
        if (!producto) throw invalido(`La pieza "${item.pieza_id}" ya no está disponible.`);
        return { producto, cantidad: item.cantidad, ...validarPieza(producto, item.personalizacion) };
      });

      for (const item of items) {
        if (item.personalizacion.foto) {
          item.personalizacion.foto = await guardarFoto(client, item.personalizacion.foto);
        }
      }

      // Si alguna pieza tiene el precio a confirmar, el total tambien.
      const total = items.some((i) => i.precio == null)
        ? null
        : redondear(items.reduce((n, i) => n + i.precio * i.cantidad, 0));

      let usuarioId = null;
      if (req.usuario?.id) {
        const { rows } = await client.query(`SELECT id, activo FROM usuarios WHERE id = $1`, [req.usuario.id]);
        // El token sigue siendo valido hasta que venza, asi que alguien
        // suspendido podria tenerlo guardado. Lo frenamos aca tambien.
        if (rows[0] && !rows[0].activo) throw invalido("Tu cuenta está suspendida.", 403);
        usuarioId = rows[0]?.id ?? null;
      }

      const { rows: numeroRows } = await client.query(
        `SELECT LPAD(nextval('pedido_numero_seq')::text, 4, '0') AS numero`
      );

      const { rows: pedidoRows } = await client.query(
        `INSERT INTO pedidos (numero, usuario_id, cliente_nombre, cliente_email, cliente_telefono, total)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, numero, estado, cliente_nombre, cliente_email, cliente_telefono, total, creado_en`,
        [numeroRows[0].numero, usuarioId, datos.cliente_nombre, datos.cliente_email,
         datos.cliente_telefono, total]
      );
      const pedido = pedidoRows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO pedido_items
             (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, personalizacion)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [pedido.id, item.producto.id, item.producto.nombre, item.precio, item.cantidad,
           JSON.stringify(item.personalizacion)]
        );
      }

      await client.query(
        `INSERT INTO pedido_historial (pedido_id, estado, nota) VALUES ($1, 'pendiente', 'Pedido recibido')`,
        [pedido.id]
      );

      return {
        ...pedido,
        total: pedido.total == null ? null : Number(pedido.total),
        items: items.map((i) => ({
          nombre: i.producto.nombre,
          precio_unitario: i.precio,
          cantidad: i.cantidad,
          personalizacion: i.personalizacion,
        })),
      };
    });

    enviarEnSegundoPlano(resultado.cliente_email, resultado.cliente_nombre, mailResumenPedido(resultado));
    avisarPedidoNuevo(resultado, !!req.usuario);

    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
});

// Pedidos del cliente con cuenta.
router.get("/mis", requiereAuth, async (req, res, next) => {
  try {
    res.json(await cargarPedidos("p.usuario_id = $1", [req.usuario.id]));
  } catch (err) {
    next(err);
  }
});

// Seguimiento sin cuenta: hace falta el numero Y el email del pedido,
// asi nadie puede mirar pedidos ajenos probando numeros.
const seguimientoSchema = z.object({
  numero: z.string().trim().regex(/^\d{1,10}$/).transform((n) => n.padStart(4, "0")),
  email: emailCampo,
});

router.get("/seguimiento", async (req, res, next) => {
  try {
    const { numero, email } = seguimientoSchema.parse(req.query);
    const [pedido] = await cargarPedidos("p.numero = $1 AND p.cliente_email = $2", [numero, email]);
    if (!pedido) throw invalido("No encontramos un pedido con ese número y ese email.", 404);
    // El seguimiento publico no muestra el telefono del cliente ni el id de usuario.
    const { cliente_telefono: _t, usuario_id: _u, ...publico } = pedido;
    res.json(publico);
  } catch (err) {
    next(err);
  }
});

// Panel: todos los pedidos (?estado=pendiente para filtrar).
router.get("/", requiereAdmin, async (req, res, next) => {
  try {
    const estado = req.query.estado ? estadoSchema.shape.estado.parse(req.query.estado) : null;
    res.json(await cargarPedidos("($1::text IS NULL OR p.estado = $1)", [estado]));
  } catch (err) {
    next(err);
  }
});

const idSchema = z.coerce.number().int().positive();

// Avanza el pedido. Queda en el historial y se le avisa al cliente por correo.
router.patch("/:id/estado", requiereAdmin, async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const { estado, nota } = estadoSchema.parse(req.body);

    const pedido = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE pedidos SET estado = $1, actualizado_en = NOW() WHERE id = $2
         RETURNING id, numero, estado, cliente_nombre, cliente_email, total`,
        [estado, id]
      );
      if (!rows[0]) throw invalido("Pedido no encontrado.", 404);
      await client.query(
        `INSERT INTO pedido_historial (pedido_id, estado, nota) VALUES ($1, $2, $3)`,
        [id, estado, nota || null]
      );
      return { ...rows[0], total: rows[0].total == null ? null : Number(rows[0].total) };
    });

    enviarEnSegundoPlano(pedido.cliente_email, pedido.cliente_nombre, mailCambioEstado(pedido, nota));
    res.json(pedido);
  } catch (err) {
    next(err);
  }
});

// Para los pedidos con precio a confirmar: Yosi carga el total cotizado.
router.patch("/:id/total", requiereAdmin, async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const { total } = totalSchema.parse(req.body);
    const { rows } = await query(
      `UPDATE pedidos SET total = $1, actualizado_en = NOW() WHERE id = $2 RETURNING id, numero, total`,
      [redondear(total), id]
    );
    if (!rows[0]) throw invalido("Pedido no encontrado.", 404);
    res.json({ ...rows[0], total: Number(rows[0].total) });
  } catch (err) {
    next(err);
  }
});
