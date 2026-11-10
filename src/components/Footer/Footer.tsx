import { Link } from "react-router-dom";
import logo from "../../assets/logo.webp";
import { INSTAGRAM_URL } from "../../config";
import "./Footer.scss";

// Abre el chat de Instagram directamente
const DM_URL = "https://ig.me/m/yosiart.resina";

// La "P" de Pixelmate hecha de píxeles, para la firma del pie
const PIXELES: Array<[number, number]> = [
  [0, 0], [1, 0], [2, 0], [3, 0],
  [0, 1], [4, 1],
  [0, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [3, 3],
  [0, 4], [0, 5], [0, 6],
];
const LogoPixelmate = () => (
  <svg viewBox="-2 -12 64 84" width="14" height="18" aria-hidden="true">
    {PIXELES.map(([c, r]) => (
      <rect key={`${c}-${r}`} x={c * 10} y={r * 10} width="8.5" height="8.5" rx="2" fill="currentColor" />
    ))}
    <rect x="50" y="-10" width="8.5" height="8.5" rx="2" fill="#2DD4BF" />
  </svg>
);

const Footer = () => (
  <footer className="footer">
    <div className="footer__contenido contenedor">
      <div className="footer__marca">
        <Link to="/" className="footer__logo" aria-label="YosiArt, volver al inicio">
          <img src={logo} alt="" width="56" height="56" />
          <span>YosiArt</span>
        </Link>
        <p>Recuerdos que brillan para siempre. Piezas de resina personalizadas, hechas a mano en Buenos Aires.</p>
      </div>

      <nav className="footer__columna" aria-label="Pie de página">
        <h2>Navegá</h2>
        <ul>
          <li><a href="/#catalogo">Catálogo</a></li>
          <li><Link to="/personalizar">Personalizá tu pieza</Link></li>
          <li><Link to="/presupuesto">Pedir presupuesto</Link></li>
          <li><Link to="/seguimiento">Seguí tu pedido</Link></li>
        </ul>
      </nav>

      <div className="footer__columna">
        <h2>Hablemos</h2>
        <ul>
          <li><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">@yosiart.resina</a></li>
          <li><span>Envíos en CABA</span></li>
        </ul>
      </div>

      <div className="footer__columna footer__compra">
        <h2>Compra tranquilo</h2>
        <p>¿Querés cancelar una compra? Escribinos y lo resolvemos.</p>
        {/* Obligatorio para vender online en Argentina (Res. 424/2020): visible,
            accesible desde el inicio y sin pedir registro. */}
        <a className="footer__arrepentimiento" href={DM_URL} target="_blank" rel="noopener noreferrer">
          Botón de arrepentimiento
        </a>
      </div>
    </div>

    <div className="footer__base contenedor">
      <p>© {new Date().getFullYear()} YosiArt. Todos los derechos reservados.</p>
      <a className="footer__pixelmate" href="https://pixelmate.com.ar" target="_blank" rel="noopener">
        Web hecha por <LogoPixelmate /> <strong>Pixelmate</strong>
      </a>
    </div>
  </footer>
);

export default Footer;
