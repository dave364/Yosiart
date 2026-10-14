import { Link } from "react-router-dom";
import logo from "../../assets/logo.webp";
import { INSTAGRAM_URL } from "../../config";
import "./Footer.scss";

const Footer = () => (
  <footer className="footer">
    <div className="footer__contenido contenedor">
      <Link to="/" className="footer__marca">
        <img src={logo} alt="" width="44" height="44" />
        <span>YosiArt</span>
      </Link>
      <nav aria-label="Pie de página" className="footer__links">
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">@yosiart.resina</a>
        <Link to="/seguimiento">Seguí tu pedido</Link>
        <Link to="/presupuesto">Pedir presupuesto</Link>
        {/* TODO: completar las zonas reales de envío */}
        <span>Envíos a [ZONAS]</span>
      </nav>
    </div>
  </footer>
);

export default Footer;
