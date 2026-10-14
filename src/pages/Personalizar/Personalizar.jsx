import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PIEZAS, COLORES, GLITTERS, MAX_NOMBRE, buscarPieza, buscarColor, plata } from "../../data/piezas";
import { useCart } from "../../context/CartContext";
import { telefonoParece } from "../../utils/telefono";
import { achicarFoto } from "../../utils/foto";
import Pieza3D from "../../components/Pieza3D/Pieza3D";
import Icono from "../../components/Icono/Icono";
import "./Personalizar.scss";

const OPCIONES_INICIALES = {
  color: "frambuesa",
  glitter: "dorado",
  nombre: "",
  telefono: "",
  telefonoLado: "dorso", // en las chapitas de mascotas el teléfono suele ir atrás
  foto: null,
};

const Personalizar = () => {
  const [params, setParams] = useSearchParams();
  const pieza = buscarPieza(params.get("pieza")) || PIEZAS[0];

  const [opciones, setOpciones] = useState(OPCIONES_INICIALES);
  const [cantidad, setCantidad] = useState(1);
  const [errorFoto, setErrorFoto] = useState(null);
  const [cargandoFoto, setCargandoFoto] = useState(false);
  const [intento, setIntento] = useState(false);
  const [agregado, setAgregado] = useState(null);

  const { agregar } = useCart();

  const cambiar = (campo, valor) => {
    setOpciones((o) => ({ ...o, [campo]: valor }));
    setAgregado(null);
  };

  const elegirPieza = (id) => {
    setParams({ pieza: id }, { replace: true });
    setAgregado(null);
  };

  const alElegirFoto = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    setErrorFoto(null);
    setCargandoFoto(true);
    try {
      cambiar("foto", await achicarFoto(archivo));
    } catch (err) {
      setErrorFoto(err.message);
    } finally {
      setCargandoFoto(false);
    }
  };

  // Validaciones
  const nombre = opciones.nombre.trim();
  const errorNombre = pieza.lleva.nombre && !nombre ? "Escribí el nombre que va en la pieza." : null;
  const telefono = opciones.telefono.trim();
  const errorTelefono =
    pieza.lleva.telefono && telefono && !telefonoParece(telefono)
      ? "Revisá el número: tiene que tener 10 dígitos con el código de área (ej: 11 1234-5678)."
      : null;
  const errorFotoFalta = pieza.lleva.foto && !opciones.foto ? "Subí la foto que va dentro de la pieza." : null;
  const valido = !errorNombre && !errorTelefono && !errorFotoFalta;

  // Solo las chapitas de mascotas permiten llevar el teléfono en el dorso.
  const ladoTelefono = pieza.lleva.telefonoAtras ? opciones.telefonoLado : "frente";

  const alAgregar = () => {
    setIntento(true);
    if (!valido) return;
    // Solo guardamos los datos que esta pieza usa.
    const datos = {
      color: opciones.color,
      glitter: opciones.glitter,
      nombre,
      telefono: pieza.lleva.telefono ? telefono : "",
      telefonoLado: pieza.lleva.telefono && telefono ? ladoTelefono : null,
      foto: pieza.lleva.foto ? opciones.foto : null,
    };
    agregar(pieza, datos, cantidad);
    setAgregado({ cantidad, nombre });
    setIntento(false);
  };

  const color = buscarColor(opciones.color);

  return (
    <main className="personalizar contenedor">
      <h1 className="personalizar__titulo">Personalizá tu pieza</h1>
      <p className="bajada">Elegí cada detalle y mirá cómo va quedando.</p>

      <div className="personalizar__grilla">
        <section className="personalizar__vista" aria-label="Vista previa">
          <div className="personalizar__vista-caja">
            <Pieza3D
              forma={pieza.forma}
              color={opciones.color}
              glitter={opciones.glitter}
              nombre={opciones.nombre}
              telefono={pieza.lleva.telefono ? opciones.telefono : ""}
              telefonoLado={ladoTelefono}
              foto={pieza.lleva.foto ? opciones.foto : null}
            />
            <p>Vista previa aproximada: cada pieza es hecha a mano y puede variar un poco.</p>
          </div>
        </section>

        <section className="personalizar__opciones" aria-label="Opciones">
          <fieldset className="grupo">
            <legend>1. Elegí la pieza</legend>
            <div className="chips">
              {PIEZAS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="chip"
                  aria-pressed={p.id === pieza.id}
                  onClick={() => elegirPieza(p.id)}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="grupo">
            <legend>
              2. Color de la resina: <span className="grupo__valor">{color.nombre}</span>
            </legend>
            <div className="swatches">
              {COLORES.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className="swatch"
                  style={{ background: c.hex }}
                  aria-label={c.nombre}
                  aria-pressed={opciones.color === c.id}
                  onClick={() => cambiar("color", c.id)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="grupo">
            <legend>3. Glitter</legend>
            <div className="chips">
              {GLITTERS.map((g) => (
                <button
                  type="button"
                  key={g.id}
                  className="chip"
                  aria-pressed={opciones.glitter === g.id}
                  onClick={() => cambiar("glitter", g.id)}
                >
                  {g.nombre}
                </button>
              ))}
            </div>
          </fieldset>

          {pieza.lleva.nombre && (
            <div className="campo">
              <label htmlFor="nombre">4. Nombre</label>
              <input
                id="nombre"
                type="text"
                maxLength={MAX_NOMBRE}
                value={opciones.nombre}
                onChange={(e) => cambiar("nombre", e.target.value.slice(0, MAX_NOMBRE))}
                placeholder="Ej: Luna"
                aria-invalid={intento && !!errorNombre}
                aria-describedby="nombre-ayuda"
              />
              <span id="nombre-ayuda" className="campo__ayuda">
                Hasta {MAX_NOMBRE} letras. Te quedan {MAX_NOMBRE - opciones.nombre.length}.
              </span>
              {intento && errorNombre && <span className="campo__error">{errorNombre}</span>}
            </div>
          )}

          {pieza.lleva.telefono && (
            <div className="campo">
              <label htmlFor="telefono">
                Teléfono <span className="campo__opcional">(opcional, para identificación)</span>
              </label>
              <input
                id="telefono"
                type="tel"
                inputMode="tel"
                maxLength={16}
                value={opciones.telefono}
                onChange={(e) => cambiar("telefono", e.target.value)}
                placeholder="Ej: 11 1234-5678"
                aria-invalid={!!errorTelefono}
              />
              {errorTelefono && <span className="campo__error">{errorTelefono}</span>}
              {pieza.lleva.telefonoAtras && (
              <div className="chips" role="group" aria-label="Dónde va el teléfono">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={opciones.telefonoLado === "dorso"}
                  onClick={() => cambiar("telefonoLado", "dorso")}
                >
                  Atrás, en el dorso
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={opciones.telefonoLado === "frente"}
                  onClick={() => cambiar("telefonoLado", "frente")}
                >
                  Adelante, debajo del nombre
                </button>
              </div>
              )}
            </div>
          )}

          {pieza.lleva.foto && (
            <div className="campo">
              <span className="campo__titulo">5. Tu foto</span>
              <label htmlFor="foto" className="subir-foto">
                <Icono nombre="subir" />
                {cargandoFoto
                  ? "Cargando foto…"
                  : opciones.foto
                  ? "Foto cargada (tocá para cambiarla)"
                  : "Subí la foto de tu mascota o persona"}
              </label>
              <input id="foto" type="file" accept="image/*" className="solo-lectores" onChange={alElegirFoto} />
              <span className="campo__ayuda">Usá una foto nítida, con buena luz y la cara bien centrada.</span>
              {errorFoto && <span className="campo__error">{errorFoto}</span>}
              {intento && errorFotoFalta && <span className="campo__error">{errorFotoFalta}</span>}
            </div>
          )}

          <div className="resumen">
            <div className="resumen__cantidad">
              <span>Cantidad</span>
              <button type="button" aria-label="Restar uno" onClick={() => setCantidad((n) => Math.max(1, n - 1))}>
                −
              </button>
              <span aria-live="polite" className="resumen__numero">{cantidad}</span>
              <button type="button" aria-label="Sumar uno" onClick={() => setCantidad((n) => Math.min(50, n + 1))}>
                +
              </button>
            </div>
            <span className="resumen__precio">
              {pieza.precio == null ? plata(null) : plata(pieza.precio * cantidad)}
            </span>
          </div>

          <button type="button" className="btn btn--grande btn--ancho" onClick={alAgregar} disabled={cargandoFoto}>
            Agregar al carrito
          </button>

          {agregado && (
            <div role="status" className="aviso">
              <span>
                ¡Listo! Agregaste {agregado.cantidad} × {pieza.nombre.toLowerCase()}
                {agregado.nombre && ` "${agregado.nombre}"`} al carrito.
              </span>
              <Link to="/carrito">Ver carrito →</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default Personalizar;
