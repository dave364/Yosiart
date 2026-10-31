// Pedidos: armar el pedido (validar cada pieza y calcular el precio),
// consultarlo y avanzarlo desde el panel.
import { withTransaction } from "../db.js";
import { datoInvalido, noEncontrado, prohibido } from "../lib/errores.js";
import { telefonoValido } from "../lib/telefono.js";
import * as pedidosRepo from "../repositories/pedidos.repository.js";
import * as productosRepo from "../repositories/productos.repository.js";
import * as usuariosRepo from "../repositories/usuarios.repository.js";
import { guardarFoto, esDataUrl } from "./fotos.service.js";
import { mailResumenPedido, mailCambioEstado, enviarEnSegundoPlano, avisarPedidoNuevo } from "./mail.service.js";

const redondear = (n) => Math.round(n * 100) / 100;

// Revisa la personalizacion contra lo que la pieza permite y devuelve
// la version limpia, con la medida y el precio que decide el servidor.
export function validarPieza(producto, p) {
  const nombrePieza = producto.nombre;
  const lleva = producto.lleva || {};

  // Forma: si la pieza tiene varias (las chapitas), tiene que ser una de esas.
  const permitidas = producto.formas?.length ? producto.formas : [producto.forma];
  const forma = p.forma || permitidas[0];
  if (!permitidas.includes(forma)) throw datoInvalido(`"${nombrePieza}" no viene en esa forma.`);

  // Tamaño: solo si la forma tiene tamaños cargados.
  const tamanos = producto.tamanos?.[forma];
  let tamano = null;
  if (tamanos?.length) {
    tamano = tamanos.find((t) => t.id === (p.tamano || tamanos[0].id));
    if (!tamano) throw datoInvalido(`"${nombrePieza}" no viene en ese tamaño.`);
  }

  const nombre = lleva.nombre ? p.nombre : "";
  if (lleva.nombre && !nombre) throw datoInvalido(`Falta el nombre que va en "${nombrePieza}".`);

  const telefono = lleva.telefono && p.telefono ? p.telefono : null;
  if (telefono && !telefonoValido(telefono)) {
    throw datoInvalido(`El teléfono de "${nombrePieza}" tiene que tener 10 dígitos con el código de área.`);
  }
  const telefonoLado = telefono ? (lleva.telefonoAtras ? p.telefonoLado || "dorso" : "frente") : null;

  const foto = lleva.foto ? p.foto : null;
  if (lleva.foto && !esDataUrl(foto)) throw datoInvalido(`Falta la foto que va en "${nombrePieza}".`);

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
      // El color de letra solo importa si la pieza lleva algo escrito.
      letra: nombre || telefono ? p.letra || "plateado" : null,
      telefono,
      telefonoLado,
      foto,
    },
  };
}

export async function crear(datos, usuarioToken) {
  const slugs = [...new Set(datos.items.map((i) => i.pieza_id))];

  const pedido = await withTransaction(async (conexion) => {
    const productos = await productosRepo.buscarActivosPorSlug(slugs, conexion);
    const porSlug = new Map(productos.map((p) => [p.slug, p]));

    // Primero se valida todo; las fotos se guardan recien cuando el
    // pedido entero esta bien.
    const items = datos.items.map((item) => {
      const producto = porSlug.get(item.pieza_id);
      if (!producto) throw datoInvalido(`La pieza "${item.pieza_id}" ya no está disponible.`);
      return { producto, cantidad: item.cantidad, ...validarPieza(producto, item.personalizacion) };
    });

    for (const item of items) {
      if (item.personalizacion.foto) {
        item.personalizacion.foto = await guardarFoto(conexion, item.personalizacion.foto);
      }
    }

    // Si alguna pieza tiene el precio a confirmar, el total tambien.
    const total = items.some((i) => i.precio == null)
      ? null
      : redondear(items.reduce((n, i) => n + i.precio * i.cantidad, 0));

    let usuarioId = null;
    if (usuarioToken?.id) {
      const usuario = await usuariosRepo.buscarEstado(usuarioToken.id, conexion);
      // El token sigue siendo valido hasta que venza, asi que alguien
      // suspendido podria tenerlo guardado. Lo frenamos aca tambien.
      if (usuario && !usuario.activo) throw prohibido("Tu cuenta está suspendida.");
      usuarioId = usuario?.id ?? null;
    }

    const numero = await pedidosRepo.siguienteNumero(conexion);
    const nuevo = await pedidosRepo.crear(conexion, { numero, usuarioId, cliente: datos, total });

    for (const item of items) {
      await pedidosRepo.agregarItem(conexion, nuevo.id, {
        productoId: item.producto.id,
        nombre: item.producto.nombre,
        precio: item.precio,
        cantidad: item.cantidad,
        personalizacion: item.personalizacion,
      });
    }
    await pedidosRepo.agregarHistorial(conexion, nuevo.id, "pendiente", "Pedido recibido");

    return {
      ...nuevo,
      items: items.map((i) => ({
        nombre: i.producto.nombre,
        precio_unitario: i.precio,
        cantidad: i.cantidad,
        personalizacion: i.personalizacion,
      })),
    };
  });

  enviarEnSegundoPlano(pedido.cliente_email, pedido.cliente_nombre, mailResumenPedido(pedido));
  avisarPedidoNuevo(pedido, !!usuarioToken);
  return pedido;
}

export const listarDeUsuario = (usuarioId) => pedidosRepo.listarDeUsuario(usuarioId);

export async function seguimiento({ numero, email }) {
  const pedido = await pedidosRepo.buscarPorNumeroYEmail(numero, email);
  if (!pedido) throw noEncontrado("No encontramos un pedido con ese número y ese email.");
  // El seguimiento publico no muestra el telefono del cliente ni el id de usuario.
  const { cliente_telefono: _t, usuario_id: _u, ...publico } = pedido;
  return publico;
}

export const listar = (estado) => pedidosRepo.listar(estado);

// Avanza el pedido. Queda en el historial y se le avisa al cliente por correo.
export async function cambiarEstado(id, { estado, nota }) {
  const pedido = await withTransaction(async (conexion) => {
    const actualizado = await pedidosRepo.cambiarEstado(conexion, id, estado);
    if (!actualizado) throw noEncontrado("Pedido no encontrado.");
    await pedidosRepo.agregarHistorial(conexion, id, estado, nota || null);
    return actualizado;
  });

  enviarEnSegundoPlano(pedido.cliente_email, pedido.cliente_nombre, mailCambioEstado(pedido, nota));
  return pedido;
}

// Para los pedidos con precio a confirmar: Yosi carga el total cotizado.
export async function cargarTotal(id, total) {
  const pedido = await pedidosRepo.cambiarTotal(id, redondear(total));
  if (!pedido) throw noEncontrado("Pedido no encontrado.");
  return pedido;
}
