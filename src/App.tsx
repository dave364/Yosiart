import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import AuthModal from "./components/Auth/AuthModal";
import Reset from "./components/Reset/Reset";
import Home from "./pages/Home/Home";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { CatalogoProvider } from "./context/CatalogoContext";

// El inicio viene en el paquete principal; el resto de las páginas se baja
// recién cuando alguien entra, así la tienda abre más rápido en el celular.
const Personalizar = lazy(() => import("./pages/Personalizar/Personalizar"));
const Carrito = lazy(() => import("./pages/Carrito/Carrito"));
const Presupuesto = lazy(() => import("./pages/Presupuesto/Presupuesto"));
const Seguimiento = lazy(() => import("./pages/Seguimiento/Seguimiento"));
const Admin = lazy(() => import("./pages/Admin/Admin"));

const Cargando = () => (
  <main className="contenedor" style={{ minHeight: "60vh" }} aria-busy="true" />
);

// Al cambiar de pagina vuelve arriba; si la URL trae #ancla, baja hasta ella.
const ManejarScroll = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash && !hash.startsWith("#reset=")) {
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
};

const NoEncontrada = () => (
  <main
    className="contenedor"
    style={{ padding: "64px 24px", textAlign: "center" }}
  >
    <h1 className="titulo-seccion">Esta página no existe</h1>
    <p className="bajada">Puede que el enlace esté mal escrito.</p>
    <Link to="/" className="btn">
      Volver al inicio
    </Link>
  </main>
);

// La tienda: con la barra, el pie y el modal de cuenta.
const Tienda = () => (
  <>
    <Navbar />
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/personalizar" element={<Personalizar />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/presupuesto" element={<Presupuesto />} />
        <Route path="/seguimiento" element={<Seguimiento />} />
        <Route path="*" element={<NoEncontrada />} />
      </Routes>
    </Suspense>
    <Footer />
    <AuthModal />
  </>
);

function App() {
  const { hash } = useLocation();

  // El email de "olvidé mi contraseña" manda a /#reset=TOKEN.
  if (hash.startsWith("#reset="))
    return <Reset token={hash.slice("#reset=".length)} />;

  return (
    <AuthProvider>
      <CatalogoProvider>
        <CartProvider>
          <ManejarScroll />
          <Suspense fallback={<Cargando />}>
            <Routes>
              {/* El panel tiene su propia barra, sin la de la tienda. */}
              <Route path="/admin" element={<Admin />} />
              <Route path="/*" element={<Tienda />} />
            </Routes>
          </Suspense>
        </CartProvider>
      </CatalogoProvider>
    </AuthProvider>
  );
}

export default App;
