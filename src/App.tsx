import { useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import AuthModal from "./components/Auth/AuthModal";
import Reset from "./components/Reset/Reset";
import Home from "./pages/Home/Home";
import Personalizar from "./pages/Personalizar/Personalizar";
import Carrito from "./pages/Carrito/Carrito";
import Presupuesto from "./pages/Presupuesto/Presupuesto";
import Seguimiento from "./pages/Seguimiento/Seguimiento";
import Admin from "./pages/Admin/Admin";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { CatalogoProvider } from "./context/CatalogoContext";

// Al cambiar de pagina vuelve arriba; si la URL trae #ancla, baja hasta ella.
const ManejarScroll = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash && !hash.startsWith("#reset=")) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
};

const NoEncontrada = () => (
  <main className="contenedor" style={{ padding: "64px 24px", textAlign: "center" }}>
    <h1 className="titulo-seccion">Esta página no existe</h1>
    <p className="bajada">Puede que el enlace esté mal escrito.</p>
    <Link to="/" className="btn">Volver al inicio</Link>
  </main>
);

// La tienda: con la barra, el pie y el modal de cuenta.
const Tienda = () => (
  <>
    <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/personalizar" element={<Personalizar />} />
      <Route path="/carrito" element={<Carrito />} />
      <Route path="/presupuesto" element={<Presupuesto />} />
      <Route path="/seguimiento" element={<Seguimiento />} />
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
    <Footer />
    <AuthModal />
  </>
);

function App() {
  const { hash } = useLocation();

  // El email de "olvidé mi contraseña" manda a /#reset=TOKEN.
  if (hash.startsWith("#reset=")) return <Reset token={hash.slice("#reset=".length)} />;

  return (
    <AuthProvider>
      <CatalogoProvider>
        <CartProvider>
          <ManejarScroll />
          <Routes>
            {/* El panel tiene su propia barra, sin la de la tienda. */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/*" element={<Tienda />} />
          </Routes>
        </CartProvider>
      </CatalogoProvider>
    </AuthProvider>
  );
}

export default App;
