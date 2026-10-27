// Envio de correos. Todo el contacto con el proveedor vive aca:
// cambiar de Brevo a otro servicio es tocar solo la funcion enviar().
import { BREVO_API_KEY, MAIL_FROM_EMAIL, MAIL_FROM_NOMBRE, SITIO_URL, API_URL, ADMIN_EMAIL } from "./config.js";

// Las fotos se guardan como "/api/fotos/<id>"; en un correo hace falta
// la direccion completa.
const fotoAbsoluta = (f) => (String(f).startsWith("/") ? API_URL + f : f);

// Trabajo que sigue despues de responder (los correos).
// En Node alcanza con no esperar la promesa. En Cloudflare, en cambio, el
// worker se detiene apenas responde y el correo quedaria a medias: ahi
// worker/index.js registra waitUntil para que lo deje terminar.
let segundoPlano = () => {};
export const usarSegundoPlano = (fn) => { segundoPlano = fn; };
const enFondo = (promesa, contexto) =>
  segundoPlano(promesa.catch((err) => console.error(`[mail] ${contexto}:`, err.message)));
import { describirPersonalizacion, ESTADOS_PEDIDO } from "./catalogo.js";

const API = "https://api.brevo.com/v3/smtp/email";

// Punto de miles a mano. toLocaleString("es-AR") en el servidor no
// agrupa los numeros de cuatro cifras (da "2800"), mientras que el
// navegador si ("2.800"): asi los correos quedan igual que el sitio.
const plata = (n) =>
  n == null ? "A confirmar" : "$" + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Todo lo que escribe el cliente pasa por aca antes de entrar al HTML.
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Paleta de la marca. En correo no sirven las variables CSS ni las hojas
// externas: cada color va escrito a mano en el atributo style.
const FRAMBUESA = "#A8124C";
const TINTA = "#3A1A2A";
const TINTA_SUAVE = "#7A5468";
const BLUSH = "#FDF3F6";
const BLUSH_2 = "#F8E1EA";

async function enviar({ para, nombre, asunto, html }) {
  // Sin clave configurada no rompemos nada: avisamos y seguimos.
  // Un pedido valido no puede fallar porque el correo no este listo.
  if (!BREVO_API_KEY || !MAIL_FROM_EMAIL) {
    console.warn("[mail] Sin BREVO_API_KEY o MAIL_FROM_EMAIL: no se envio a", para, "-", asunto);
    return { enviado: false, motivo: "sin configurar" };
  }

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: MAIL_FROM_EMAIL, name: MAIL_FROM_NOMBRE },
        to: [{ email: para, name: nombre }],
        subject: asunto,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.error("[mail] Brevo respondio", res.status, detalle.slice(0, 300));
      return { enviado: false, motivo: "error del proveedor" };
    }
    return { enviado: true };
  } catch (err) {
    console.error("[mail] No se pudo enviar a", para, err.message);
    return { enviado: false, motivo: "excepcion" };
  }
}

// Envuelve el contenido en la estructura comun. Usamos tablas y estilos
// en linea porque es lo unico que respetan Gmail, Outlook y compania.
function plantilla(contenido) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BLUSH};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BLUSH};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <tr>
          <td style="background:${BLUSH_2};padding:22px 24px;text-align:center;">
            <!-- El alt reemplaza al logo cuando el correo bloquea las imagenes,
                 que es lo que hacen Gmail y Outlook por defecto. -->
            <img src="${SITIO_URL}/logo.png" width="84" height="84" alt="YosiArt"
                 style="width:84px;height:84px;border-radius:50%;display:block;margin:0 auto;border:0;color:${FRAMBUESA};font-size:26px;font-weight:bold;">
            <div style="font-size:11px;color:${TINTA_SUAVE};letter-spacing:3px;margin-top:10px;">RESINA HECHA A MANO</div>
          </td>
        </tr>
        <tr><td style="padding:28px 24px;color:${TINTA};font-size:15px;line-height:1.6;">
          ${contenido}
        </td></tr>
        <tr>
          <td style="background:${BLUSH_2};padding:18px 24px;text-align:center;color:${TINTA_SUAVE};font-size:12px;line-height:1.5;">
            Recibís este correo porque hiciste un pedido o tenés una cuenta en YosiArt.<br>
            Si necesitás algo, respondé este mensaje.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function boton(texto, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;">
    <tr><td style="background:${FRAMBUESA};border-radius:999px;">
      <a href="${url}" style="display:inline-block;padding:13px 30px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">${texto}</a>
    </td></tr>
  </table>`;
}

const primerNombre = (n) => esc((n || "").split(" ")[0]);

// Filas con cada pieza del pedido y su personalizacion.
function tablaItems(items = []) {
  return items
    .map((i) => {
      const precio = i.precio_unitario ?? i.precio;
      const detalle = describirPersonalizacion(i.personalizacion);
      return `
      <tr>
        <td style="padding:10px 0;vertical-align:top;border-bottom:1px solid ${BLUSH_2};">
          <div style="font-weight:bold;">${i.cantidad} × ${esc(i.nombre_producto ?? i.nombre)}</div>
          ${detalle ? `<div style="font-size:13px;color:${TINTA_SUAVE};">${esc(detalle)}</div>` : ""}
        </td>
        <td align="right" style="padding:10px 0 10px 12px;vertical-align:top;white-space:nowrap;border-bottom:1px solid ${BLUSH_2};">
          ${precio == null ? "A confirmar" : plata(Number(precio) * i.cantidad)}
        </td>
      </tr>`;
    })
    .join("");
}

export function mailBienvenida(usuario) {
  const contenido = `
    <h1 style="font-size:23px;color:${FRAMBUESA};margin:0 0 14px;">¡Hola, ${primerNombre(usuario.nombre)}! Ya tenés tu cuenta en YosiArt</h1>
    <p style="margin:0 0 16px;">
      Gracias por sumarte. Cada pieza la hacemos a mano, una por una, con el
      nombre o la foto de quien más querés.
    </p>
    <p style="margin:0 0 10px;font-weight:bold;color:${FRAMBUESA};">Con tu cuenta podés:</p>
    <ul style="margin:0 0 20px;padding-left:20px;">
      <li style="margin-bottom:8px;">Seguir tus pedidos paso a paso, desde que los recibimos hasta que te llegan.</li>
      <li style="margin-bottom:8px;">No volver a cargar tus datos cada vez que comprás.</li>
    </ul>
    ${boton("Personalizar una pieza", SITIO_URL + "/personalizar")}
  `;
  return { asunto: "¡Bienvenida/o a YosiArt!", html: plantilla(contenido) };
}

export function mailResumenPedido(pedido) {
  const numero = esc(pedido.numero || pedido.id);
  const contenido = `
    <h1 style="font-size:23px;color:${FRAMBUESA};margin:0 0 6px;">¡Gracias por tu pedido, ${primerNombre(pedido.cliente_nombre)}!</h1>
    <p style="margin:0 0 20px;">
      Tu pedido <strong>#${numero}</strong> quedó registrado. Lo revisamos y te
      escribimos para confirmarlo y coordinar el pago y la entrega.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${tablaItems(pedido.items)}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      <tr>
        <td style="font-size:18px;font-weight:bold;color:${FRAMBUESA};">Total</td>
        <td align="right" style="font-size:18px;font-weight:bold;color:${FRAMBUESA};">${plata(pedido.total)}</td>
      </tr>
    </table>
    ${pedido.total == null ? `<p style="margin:14px 0 0;padding:12px;background:${BLUSH};border-radius:12px;font-size:14px;">Algunas piezas tienen el precio a confirmar: te lo pasamos al confirmar el pedido.</p>` : ""}
    ${boton("Seguir mi pedido", `${SITIO_URL}/seguimiento?numero=${encodeURIComponent(pedido.numero)}`)}
    <p style="margin:0;font-size:12px;color:${TINTA_SUAVE};text-align:center;">
      Este es un resumen de tu pedido, no una factura. Guardá el número #${numero}.
    </p>
  `;
  return { asunto: `Tu pedido #${pedido.numero} en YosiArt`, html: plantilla(contenido) };
}

// Al cliente cada vez que su pedido avanza.
export function mailCambioEstado(pedido, nota) {
  const estado = ESTADOS_PEDIDO[pedido.estado] || pedido.estado;
  const textos = {
    confirmado: "Ya confirmamos tu pedido y lo pusimos en la lista del taller.",
    en_preparacion: "¡Estamos haciendo tus piezas! La resina lleva su tiempo de secado.",
    listo: "Tus piezas ya están terminadas y listas para salir.",
    enviado: "Tu pedido ya está en camino.",
    entregado: "Tu pedido fue entregado. ¡Esperamos que te encante!",
    cancelado: "Tu pedido fue cancelado. Si no esperabas esto, respondé este correo.",
  };
  const contenido = `
    <div style="font-size:13px;color:${TINTA_SUAVE};letter-spacing:2px;font-weight:bold;">PEDIDO #${esc(pedido.numero)}</div>
    <h1 style="font-size:24px;color:${FRAMBUESA};margin:4px 0 14px;">${esc(estado)}</h1>
    <p style="margin:0 0 16px;">Hola ${primerNombre(pedido.cliente_nombre)}, ${textos[pedido.estado] || "tu pedido cambió de estado."}</p>
    ${nota ? `<p style="margin:0 0 16px;padding:12px;background:${BLUSH};border-radius:12px;font-size:14px;">${esc(nota)}</p>` : ""}
    ${pedido.total != null ? `<p style="margin:0 0 6px;">Total del pedido: <strong>${plata(pedido.total)}</strong></p>` : ""}
    ${boton("Ver el seguimiento", `${SITIO_URL}/seguimiento?numero=${encodeURIComponent(pedido.numero)}`)}
  `;
  return { asunto: `Tu pedido #${pedido.numero}: ${estado}`, html: plantilla(contenido) };
}

export function mailReset(usuario, url) {
  const contenido = `
    <h1 style="font-size:23px;color:${FRAMBUESA};margin:0 0 14px;">Cambiar tu contraseña</h1>
    <p style="margin:0 0 16px;">
      Hola ${primerNombre(usuario.nombre)}, alguien pidió cambiar la contraseña de tu cuenta
      en YosiArt. Si fuiste vos, usá este botón:
    </p>
    ${boton("Elegir una contraseña nueva", url)}
    <p style="margin:0 0 16px;font-size:14px;">El enlace vence en <strong>1 hora</strong> y se puede usar una sola vez.</p>
    <p style="margin:0 0 18px;padding:12px;background:${BLUSH};border-radius:12px;font-size:14px;">
      Si no lo pediste, ignorá este correo: tu contraseña sigue igual.
    </p>
    <p style="margin:0;font-size:12px;color:${TINTA_SUAVE};word-break:break-all;">
      Si el botón no funciona, copiá esta dirección en tu navegador:<br>${url}
    </p>
  `;
  return { asunto: "Cambiar tu contraseña de YosiArt", html: plantilla(contenido) };
}

export function mailPresupuestoRecibido(p) {
  const contenido = `
    <h1 style="font-size:23px;color:${FRAMBUESA};margin:0 0 14px;">¡Recibimos tu idea, ${primerNombre(p.nombre)}!</h1>
    <p style="margin:0 0 16px;">La vamos a revisar y te respondemos a este correo con el precio y la demora.</p>
    <p style="margin:0;padding:12px;background:${BLUSH};border-radius:12px;font-size:14px;">
      <strong>${esc(p.tipo)}</strong>${p.cantidad ? ` · ${p.cantidad} unidades` : ""}<br>${esc(p.descripcion)}
    </p>
  `;
  return { asunto: "Recibimos tu pedido de presupuesto", html: plantilla(contenido) };
}

export function mailRespuestaPresupuesto(p) {
  const contenido = `
    <h1 style="font-size:23px;color:${FRAMBUESA};margin:0 0 14px;">Tu presupuesto de YosiArt</h1>
    <p style="margin:0 0 16px;">Hola ${primerNombre(p.nombre)}, gracias por esperar. Esto es lo que te proponemos:</p>
    <p style="margin:0 0 16px;padding:14px;background:${BLUSH};border-radius:12px;white-space:pre-line;">${esc(p.respuesta)}</p>
    ${p.precio != null ? `<p style="margin:0 0 16px;font-size:18px;">Precio: <strong style="color:${FRAMBUESA};">${plata(p.precio)}</strong></p>` : ""}
    <p style="margin:0;">Si te parece bien, respondé este correo y lo empezamos.</p>
  `;
  return { asunto: "Tu presupuesto de YosiArt", html: plantilla(contenido) };
}

// Aviso para el taller cada vez que entra un pedido. Sin la plantilla de
// los clientes: es para leer rapido desde el celular y actuar.
function aviso(titulo, cuerpo) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:16px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:${TINTA};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;">
    <tr><td style="padding:22px;">
      <div style="font-size:13px;color:${TINTA_SUAVE};font-weight:bold;letter-spacing:1px;">${titulo}</div>
      ${cuerpo}
    </td></tr>
  </table>
</body></html>`;
}

export function avisarPedidoNuevo(pedido, conCuenta) {
  if (!ADMIN_EMAIL) return;
  const fotos = (pedido.items || []).map((i) => i.personalizacion?.foto).filter(Boolean);
  const html = aviso(
    "PEDIDO NUEVO",
    `<div style="font-size:28px;font-weight:bold;color:${FRAMBUESA};margin:4px 0 14px;">#${esc(pedido.numero)} · ${plata(pedido.total)}</div>
     <div style="font-size:16px;font-weight:bold;">${esc(pedido.cliente_nombre)}</div>
     <div style="font-size:14px;">${esc(pedido.cliente_email)} · ${esc(pedido.cliente_telefono)}</div>
     <div style="font-size:13px;color:${TINTA_SUAVE};margin-bottom:14px;">${conCuenta ? "Cliente registrado" : "Compra como invitado"}</div>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${tablaItems(pedido.items)}</table>
     ${fotos.map((f, n) => `<a href="${esc(fotoAbsoluta(f))}" style="display:inline-block;margin:12px 8px 0 0;color:${FRAMBUESA};">Ver foto ${n + 1}</a>`).join("")}`
  );
  enFondo(enviar({ para: ADMIN_EMAIL, nombre: "YosiArt", asunto: `Pedido nuevo #${pedido.numero} - ${pedido.cliente_nombre}`, html }), "aviso de pedido");
}

export function avisarPresupuestoNuevo(p) {
  if (!ADMIN_EMAIL) return;
  const html = aviso(
    "PRESUPUESTO NUEVO",
    `<div style="font-size:24px;font-weight:bold;color:${FRAMBUESA};margin:4px 0 14px;">${esc(p.tipo)}${p.cantidad ? ` · ${p.cantidad} u.` : ""}</div>
     <div style="font-size:16px;font-weight:bold;">${esc(p.nombre)}</div>
     <div style="font-size:14px;margin-bottom:14px;">${esc(p.email)}${p.telefono ? " · " + esc(p.telefono) : ""}</div>
     ${p.fecha_evento ? `<div style="font-size:14px;margin-bottom:10px;">Para el <strong>${esc(String(p.fecha_evento).slice(0, 10))}</strong></div>` : ""}
     <p style="margin:0 0 10px;white-space:pre-line;">${esc(p.descripcion)}</p>
     ${(p.fotos || []).map((f, n) => `<a href="${esc(fotoAbsoluta(f))}" style="display:inline-block;margin:8px 8px 0 0;color:${FRAMBUESA};">Referencia ${n + 1}</a>`).join("")}`
  );
  enFondo(enviar({ para: ADMIN_EMAIL, nombre: "YosiArt", asunto: `Presupuesto nuevo - ${p.nombre}`, html }), "aviso de presupuesto");
}

// Se llama sin await a proposito: si el correo falla o tarda, el registro
// y el pedido ya quedaron guardados igual. El cliente no espera por esto.
export function enviarEnSegundoPlano(para, nombre, { asunto, html }) {
  enFondo(enviar({ para, nombre, asunto, html }), "fallo en segundo plano");
}
