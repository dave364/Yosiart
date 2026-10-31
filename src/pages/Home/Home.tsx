import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.webp";
import { CATEGORIAS, plata, precioDesde } from "../../data/piezas";
import { useCatalogo } from "../../context/CatalogoContext";
import Pieza3D from "../../components/Pieza3D/Pieza3D";
import Icono from "../../components/Icono/Icono";
import "./Home.scss";

const PASOS = [
  { titulo: "Elegí tu pieza", texto: "Mirá el catálogo y elegí el modelo que más te guste." },
  { titulo: "Personalizala", texto: "Elegí forma, colores, nombre y, si querés, subí una foto." },
  {
    titulo: "La hacemos a mano",
    // TODO: completar la demora real de fabricacion.
    texto: "Seguí el avance de tu pedido desde tu cuenta. Demora: [X DÍAS].",
  },
];

const Home = () => {
  const [categoria, setCategoria] = useState<string | null>(null);
  const { piezas: todas } = useCatalogo();

  const elegirCategoria = (id: string | null) => {
    setCategoria(id);
    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
  };

  const piezas = categoria ? todas.filter((p) => p.categoria === categoria) : todas;
  const categoriaActual = CATEGORIAS.find((c) => c.id === categoria);

  return (
    <main>
      {/* PORTADA */}
      <section className="hero contenedor" id="inicio">
        <div className="hero__texto">
          <span className="hero__etiqueta">HECHO A MANO EN BUENOS AIRES</span>
          <h1>Recuerdos que brillan para siempre</h1>
          <p>
            Llaveros, chapitas y piezas de resina personalizadas con el nombre o la foto de
            quien más querés.
          </p>
          <div className="hero__botones">
            <a href="#catalogo" className="btn btn--grande">Ver catálogo</a>
            <Link to="/personalizar" className="btn btn--borde btn--grande">
              Quiero uno personalizado
            </Link>
          </div>
        </div>
        <div className="hero__imagen">
          <div className="hero__circulo">
            <img src={logo} alt="Ilustración de Yosi en su taller con piezas de resina" />
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="contenedor seccion">
        <h2 className="titulo-seccion">¿Qué buscás?</h2>
        <p className="bajada">Elegí una categoría y mirá todos los modelos.</p>
        <div className="categorias">
          {CATEGORIAS.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`categoria ${categoria === c.id ? "categoria--activa" : ""}`}
              aria-pressed={categoria === c.id}
              onClick={() => elegirCategoria(c.id)}
            >
              <span className="categoria__icono" style={{ background: c.color }}>
                <Icono nombre={c.icono} size={28} />
              </span>
              <span className="categoria__nombre">{c.nombre}</span>
              <span className="categoria__descripcion">{c.descripcion}</span>
            </button>
          ))}
        </div>
      </section>

      {/* CATALOGO */}
      <section className="contenedor seccion" id="catalogo">
        <div className="catalogo__encabezado">
          <div>
            <h2 className="titulo-seccion">{categoriaActual ? categoriaActual.nombre : "Los más pedidos"}</h2>
            <p className="bajada">Todos se pueden personalizar con nombre y colores.</p>
          </div>
          {categoria && (
            <button type="button" className="catalogo__ver-todos" onClick={() => setCategoria(null)}>
              Ver todos
            </button>
          )}
        </div>

        {piezas.length === 0 ? (
          <div className="catalogo__vacio">
            <p>
              {categoria === "souvenirs"
                ? "Los souvenirs los hacemos a pedido, según el evento y la cantidad."
                : "Todavía no hay piezas en esta categoría."}
            </p>
            <Link to="/presupuesto" className="btn">Pedir presupuesto</Link>
          </div>
        ) : (
          <div className="catalogo">
            {piezas.map((p, i) => (
              <article key={p.id} className="producto">
                <div className="producto__imagen">
                  {/* Cada tarjeta arranca desfasada para que no se muevan todas iguales. */}
                  <Pieza3D
                    compacta
                    forma={p.forma}
                    {...p.muestra}
                    giroInicial={-20 + i * 15}
                    etiqueta={`Ejemplo de ${p.nombre.toLowerCase()}, en 3D`}
                  />
                  {p.nuevo && <span className="producto__nuevo">Nuevo</span>}
                </div>
                <div className="producto__info">
                  <h3>{p.nombre}</h3>
                  <p>{p.descripcion}</p>
                  <div className="producto__pie">
                    <span className="producto__precio">
                      {precioDesde(p) != null && Object.keys(p.preciosTamano || {}).length > 0 ? "Desde " : ""}
                      {plata(precioDesde(p))}
                    </span>
                    <Link to={`/personalizar?pieza=${p.id}`} className="btn">
                      Personalizar
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* COMO PEDIR */}
      <section className="contenedor seccion" id="como-pedir">
        <h2 className="titulo-seccion titulo-seccion--centro">Así de fácil es pedir</h2>
        <ol className="pasos">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="paso">
              <span className="paso__numero" aria-hidden="true">{i + 1}</span>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* PRESUPUESTO */}
      <section className="contenedor seccion">
        <div className="franja">
          <div>
            <h2>¿Tenés una idea especial?</h2>
            <p>Diseñamos piezas únicas a pedido: contanos qué imaginás y lo armamos juntos.</p>
          </div>
          <Link to="/presupuesto" className="franja__boton">
            <Icono nombre="documento" size={20} />
            Pedir presupuesto
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Home;
