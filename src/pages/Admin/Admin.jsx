import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.webp";
import { useAuth } from "../../context/AuthContext";
import PanelPedidos from "./PanelPedidos";
import PanelPresupuestos from "./PanelPresupuestos";
import PanelPiezas from "./PanelPiezas";
import PanelClientes from "./PanelClientes";
import "./Admin.scss";

const SECCIONES = [
  { id: "pedidos", nombre: "Pedidos", Panel: PanelPedidos },
  { id: "presupuestos", nombre: "Presupuestos", Panel: PanelPresupuestos },
  { id: "piezas", nombre: "Piezas y precios", Panel: PanelPiezas },
  { id: "clientes", nombre: "Clientes", Panel: PanelClientes },
];

const Ingreso = () => {
  const { login, logout, usuario } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [entrando, setEntrando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setEntrando(true);
    setError(null);
    try {
      const u = await login(email.trim(), password);
      if (u.rol !== "admin") {
        logout();
        throw new Error("Esta cuenta no tiene permisos de administrador.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setEntrando(false);
    }
  };

  return (
    <main className="adm-ingreso">
      <form className="adm-ingreso__caja" onSubmit={entrar}>
        <img src={logo} alt="" width="88" height="88" />
        <h1>Panel de YosiArt</h1>
        {usuario && usuario.rol !== "admin" && (
          <p className="adm-suave">Entraste como {usuario.email}, que no es una cuenta de administrador.</p>
        )}
        <div className="campo">
          <label htmlFor="adm-email">Email</label>
          <input id="adm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </div>
        <div className="campo">
          <label htmlFor="adm-pass">Contraseña</label>
          <input id="adm-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <p className="campo__error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--ancho" disabled={entrando || !email || !password}>
          {entrando ? "Entrando…" : "Entrar"}
        </button>
        <Link to="/" className="adm-volver">← Volver a la tienda</Link>
      </form>
    </main>
  );
};

const Admin = () => {
  const { esAdmin, usuario, logout } = useAuth();
  const [seccion, setSeccion] = useState("pedidos");

  if (!esAdmin) return <Ingreso />;

  const { Panel } = SECCIONES.find((s) => s.id === seccion);

  return (
    <div className="adm">
      <header className="adm-barra">
        <div className="adm-barra__contenido">
          <Link to="/" className="adm-barra__marca">
            <img src={logo} alt="" width="40" height="40" />
            <span>YosiArt</span>
            <span className="adm-barra__panel">Panel</span>
          </Link>
          <div className="adm-barra__acciones">
            <span className="adm-suave">{usuario?.email}</span>
            <Link to="/" className="adm-link">Ver tienda</Link>
            <button type="button" className="adm-link" onClick={logout}>
              Salir
            </button>
          </div>
        </div>
        <nav className="adm-pestanas" aria-label="Secciones del panel">
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="adm-pestana"
              aria-current={seccion === s.id ? "page" : undefined}
              onClick={() => setSeccion(s.id)}
            >
              {s.nombre}
            </button>
          ))}
        </nav>
      </header>
      <main className="adm-contenido">
        <Panel />
      </main>
    </div>
  );
};

export default Admin;
