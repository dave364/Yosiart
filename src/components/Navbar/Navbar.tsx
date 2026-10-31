import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import logo from "../../assets/logo.webp";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { INSTAGRAM_URL } from "../../config";
import Icono from "../Icono/Icono";
import "./Navbar.scss";

const Navbar = () => {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuCuenta, setMenuCuenta] = useState(false);
  const cuentaRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  const { logueado, usuario, esAdmin, abrirModal, logout } = useAuth();
  const { unidades } = useCart();

  // Al cambiar de pagina se cierra el menu del celular.
  useEffect(() => {
    setMenuAbierto(false);
    setMenuCuenta(false);
  }, [pathname]);

  // Cierra el menu de la cuenta al hacer clic afuera.
  useEffect(() => {
    if (!menuCuenta) return;
    const alClickear = (e: MouseEvent) => {
      if (cuentaRef.current && !cuentaRef.current.contains(e.target as Node)) setMenuCuenta(false);
    };
    document.addEventListener("mousedown", alClickear);
    return () => document.removeEventListener("mousedown", alClickear);
  }, [menuCuenta]);

  const primerNombre = (usuario?.nombre || "").split(" ")[0] || "Mi cuenta";

  return (
    <header className="navbar">
      <div className="navbar__barra contenedor">
        <Link to="/" className="navbar__marca">
          <img src={logo} alt="" width="52" height="52" />
          <span>YosiArt</span>
        </Link>

        <button
          type="button"
          className="navbar__toggle"
          aria-expanded={menuAbierto}
          aria-controls="menu-principal"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenuAbierto((v) => !v)}
        >
          <Icono nombre={menuAbierto ? "cerrar" : "menu"} size={26} />
        </button>

        <nav
          id="menu-principal"
          aria-label="Principal"
          className={`navbar__menu ${menuAbierto ? "navbar__menu--abierto" : ""}`}
        >
          <Link to="/#catalogo">Catálogo</Link>
          <NavLink to="/personalizar">Personalizar</NavLink>
          <Link to="/#como-pedir">Cómo pedir</Link>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
            Instagram
          </a>
        </nav>

        <div className="navbar__acciones">
          {!logueado ? (
            <button type="button" className="navbar__cuenta" onClick={() => abrirModal("login")}>
              <Icono nombre="cuenta" />
              <span>Mi cuenta</span>
            </button>
          ) : (
            <div className="navbar__cuenta-wrap" ref={cuentaRef}>
              <button
                type="button"
                className="navbar__cuenta"
                aria-expanded={menuCuenta}
                onClick={() => setMenuCuenta((v) => !v)}
              >
                <Icono nombre="cuenta" />
                <span>Hola, {primerNombre}</span>
              </button>
              {menuCuenta && (
                <div className="navbar__desplegable">
                  {esAdmin && <Link to="/admin">Panel de YosiArt</Link>}
                  <Link to="/seguimiento">Mis pedidos</Link>
                  <button type="button" onClick={logout}>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}

          <Link
            to="/carrito"
            className="navbar__carrito"
            aria-label={`Carrito, ${unidades} ${unidades === 1 ? "producto" : "productos"}`}
          >
            <Icono nombre="carrito" size={20} />
            <span className="navbar__carrito-texto">Carrito</span>
            <span className="navbar__contador">{unidades}</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
