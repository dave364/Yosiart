import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { buscarColor, buscarGlitter, plata } from "../../data/piezas";
import { FORMAS } from "../../data/formas";
import { normalizarTelefono, telefonoParece } from "../../utils/telefono";
import { API_URL } from "../../config";
import PiezaPreview from "../../components/PiezaPreview/PiezaPreview";
import Icono from "../../components/Icono/Icono";
import "./Carrito.scss";

const emailParece = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const Carrito = () => {
  const { items, cambiarCantidad, quitar, vaciar, unidades, subtotal } = useCart();
  const { usuario, token, logueado, abrirModal } = useAuth();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [pedido, setPedido] = useState(null);

  // Si tiene cuenta, completamos con sus datos.
  useEffect(() => {
    if (!usuario) return;
    setNombre((v) => v || usuario.nombre || "");
    setEmail((v) => v || usuario.email || "");
    setTelefono((v) => v || usuario.telefono || "");
  }, [usuario]);

  const errores = {
    nombre: nombre.trim().length < 2 ? "Escribí tu nombre y apellido." : null,
    email: !emailParece(email) ? "Escribí un email válido: ahí te avisamos cómo va tu pedido." : null,
    telefono: !telefonoParece(telefono) ? "Tiene que tener 10 dígitos con el código de área." : null,
  };
  const valido = !errores.nombre && !errores.email && !errores.telefono;

  const confirmar = async () => {
    setIntento(true);
    if (!valido) return;
    setEnviando(true);
    setError(null);
    try {
      // TODO (backend): POST /api/pedidos tiene que aceptar la personalizacion
      // de cada item y subir la foto a Cloudinary. El pago con Mercado Pago
      // se suma al final.
      const res = await fetch(`${API_URL}/api/pedidos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cliente_nombre: nombre.trim(),
          cliente_email: email.trim(),
          cliente_telefono: normalizarTelefono(telefono),
          // El precio lo calcula el servidor: solo mandamos pieza, cantidad y personalizacion.
          items: items.map((i) => ({
            pieza_id: i.piezaId,
            cantidad: i.cantidad,
            personalizacion: i.opciones,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No pudimos registrar el pedido.");
      setPedido(data);
      vaciar();
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "No pudimos conectarnos con el servidor. Probá de nuevo en un momento."
          : err.message
      );
    } finally {
      setEnviando(false);
    }
  };

  if (pedido) {
    return (
      <main className="carrito contenedor">
        <div className="carrito__listo">
          <h1 className="titulo-seccion">¡Gracias por tu pedido!</h1>
          <p>
            Tu pedido <strong>#{pedido.numero ?? pedido.id}</strong> quedó registrado. Te escribimos a{" "}
            <strong>{email.trim()}</strong> con los próximos pasos.
          </p>
          <div className="carrito__acciones">
            <Link
              to={`/seguimiento?numero=${encodeURIComponent(pedido.numero)}&email=${encodeURIComponent(email.trim())}`}
              className="btn"
            >
              Seguir mi pedido
            </Link>
            <Link to="/" className="btn btn--borde">Volver al inicio</Link>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="carrito contenedor">
        <h1 className="titulo-seccion">Tu carrito</h1>
        <div className="carrito__vacio">
          <p>Todavía no agregaste ninguna pieza.</p>
          <Link to="/personalizar" className="btn">Personalizar una pieza</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="carrito contenedor">
      <h1 className="titulo-seccion">Tu carrito</h1>
      <p className="bajada">
        {unidades} {unidades === 1 ? "pieza personalizada" : "piezas personalizadas"}
      </p>

      <div className="carrito__grilla">
        <ul className="carrito__lista">
          {items.map((i) => {
            const color = buscarColor(i.opciones.color);
            const glitter = buscarGlitter(i.opciones.glitter);
            return (
              <li key={i.clave} className="item">
                <div className="item__preview">
                  <PiezaPreview forma={i.forma} {...i.opciones} etiqueta={`${i.nombrePieza} ${i.opciones.nombre}`} />
                </div>
                <div className="item__info">
                  <h2>{i.nombrePieza}</h2>
                  <ul className="item__detalle">
                    {i.opciones.nombre && <li>Nombre: <strong>{i.opciones.nombre}</strong></li>}
                    {i.opciones.telefono && (
                      <li>
                        Teléfono: {i.opciones.telefono}{" "}
                        ({i.opciones.telefonoLado === "frente" ? "adelante" : "en el dorso"})
                      </li>
                    )}
                    {i.opciones.tamano && (
                      <li>
                        Forma: {FORMAS[i.forma]?.nombre} · {i.opciones.tamano} (≈ {String(i.opciones.tamanoCm).replace(".", ",")} cm)
                      </li>
                    )}
                    <li>Color: {color.nombre} · {glitter.nombre}</li>
                    {i.opciones.foto && <li>Con foto</li>}
                  </ul>
                  <div className="item__pie">
                    <div className="item__cantidad">
                      <button type="button" aria-label="Restar uno" onClick={() => cambiarCantidad(i.clave, i.cantidad - 1)}>−</button>
                      <span>{i.cantidad}</span>
                      <button type="button" aria-label="Sumar uno" onClick={() => cambiarCantidad(i.clave, i.cantidad + 1)}>+</button>
                    </div>
                    <span className="item__precio">{i.precio == null ? plata(null) : plata(i.precio * i.cantidad)}</span>
                    <button type="button" className="item__quitar" onClick={() => quitar(i.clave)}>
                      <Icono nombre="basura" size={18} />
                      Quitar
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="checkout" aria-label="Datos del pedido">
          <h2>Tus datos</h2>
          {!logueado && (
            <p className="checkout__cuenta">
              ¿Ya tenés cuenta?{" "}
              <button type="button" onClick={() => abrirModal("login")}>Iniciá sesión</button> y seguí tu pedido desde ahí.
            </p>
          )}

          <div className="campo">
            <label htmlFor="c-nombre">Nombre y apellido</label>
            <input id="c-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" aria-invalid={intento && !!errores.nombre} />
            {intento && errores.nombre && <span className="campo__error">{errores.nombre}</span>}
          </div>
          <div className="campo">
            <label htmlFor="c-email">Email</label>
            <input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={intento && !!errores.email} />
            {intento && errores.email && <span className="campo__error">{errores.email}</span>}
          </div>
          <div className="campo">
            <label htmlFor="c-tel">Teléfono</label>
            <input id="c-tel" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" placeholder="Ej: 11 1234-5678" aria-invalid={intento && !!errores.telefono} />
            {intento && errores.telefono && <span className="campo__error">{errores.telefono}</span>}
          </div>

          <div className="checkout__total">
            <span>Total</span>
            <strong>{plata(subtotal)}</strong>
          </div>
          <p className="checkout__nota">El envío y el pago se coordinan en el próximo paso.</p>

          {error && <p className="campo__error" role="alert">{error}</p>}

          <button type="button" className="btn btn--grande btn--ancho" onClick={confirmar} disabled={enviando}>
            {enviando ? "Enviando…" : "Confirmar pedido"}
          </button>
        </aside>
      </div>
    </main>
  );
};

export default Carrito;
