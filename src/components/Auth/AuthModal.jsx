import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { normalizarTelefono, telefonoParece } from "../../utils/telefono";
import "./AuthModal.scss";

const API_URL = import.meta.env.VITE_API_URL || "https://yosiart.onrender.com";

const AuthModal = () => {
  const { modal, cerrarModal, abrirModal, login, registro } = useAuth();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const esRegistro = modal === "registro";
  const esRecuperar = modal === "recuperar";
  const [enviadoReset, setEnviadoReset] = useState(false);

  const pedirReset = async () => {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(API_URL + "/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        // Mostramos lo que dice el servidor: si se alcanzo el limite de
        // intentos, el cliente tiene que saber que espere, no que algo se rompio.
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No pudimos procesar el pedido.");
      }
      setEnviadoReset(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  // Al cambiar de paso limpiamos el error, pero conservamos email y nombre:
  // si alguien intento registrarse y ya tenia cuenta, no queremos que
  // vuelva a tipear todo para loguearse.
  useEffect(() => {
    setError(null);
    setPassword("");
    setEnviando(false);
    setEnviadoReset(false);
  }, [modal]);

  if (!modal) return null;

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      if (esRegistro) {
        await registro({
          nombre: nombre.trim(),
          email: email.trim(),
          telefono: normalizarTelefono(telefono),
          password,
        });
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      // Tiene que volver a false tambien cuando sale bien: si no, el
      // boton queda deshabilitado para siempre y no se puede volver
      // a entrar sin recargar la pagina.
      setEnviando(false);
    }
  };

  // Un solo @, algo antes y un dominio con punto despues.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const listo = esRegistro
    ? nombre.trim().length >= 2 &&
      emailOk &&
      telefonoParece(telefono) &&
      password.length >= 8
    : emailOk && password.length > 0;

  const alPresionar = (e) => {
    if (e.key === "Enter" && listo && !enviando) enviar();
  };

  return (
    <div className="auth-overlay" onClick={cerrarModal}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal__cerrar" onClick={cerrarModal}>
          ✕
        </button>

        <h2>{esRecuperar ? "Recuperar tu cuenta" : esRegistro ? "Crear cuenta" : "Iniciar sesión"}</h2>

        {esRegistro && (
          <p className="auth-modal__promo">
            Creá tu cuenta para guardar tus datos y seguir tus pedidos
            paso a paso.
          </p>
        )}

        {esRegistro && (
          <label className="auth-campo">
            Nombre y apellido
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={alPresionar}
              placeholder="Ana Pérez"
              autoComplete="name"
            />
          </label>
        )}

        {esRecuperar && !enviadoReset && (
          <p style={{ margin: "0 0 18px", lineHeight: 1.6, fontSize: "0.9rem" }}>
            Escribi tu email y te mandamos un enlace para elegir una contraseña
            nueva. Vence en una hora.
          </p>
        )}

        {esRecuperar && enviadoReset ? (
          <>
            <p style={{ margin: "0 0 18px", lineHeight: 1.6 }}>
              Listo. Si hay una cuenta con ese email, en unos minutos te llega
              el enlace. Revisá también la carpeta de spam.
            </p>
            <button
              className="auth-btn auth-btn--principal"
              onClick={() => abrirModal("login")}
            >
              Volver a entrar
            </button>
          </>
        ) : (
        <>
        <label className="auth-campo">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={alPresionar}
            placeholder="ana@email.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
          />
          {email.trim().length > 3 && !emailOk && (
            <small style={{ color: "#a1281c" }}>
              Revisá el email: tiene que ser como nombre@ejemplo.com (con un solo @).
            </small>
          )}
        </label>

        {esRegistro && (
          <label className="auth-campo">
            Teléfono
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              onKeyDown={alPresionar}
              placeholder="11 2345 6789"
              inputMode="numeric"
              autoComplete="tel"
            />
            {telefono.length > 0 && !telefonoParece(telefono) ? (
              <small style={{ color: "#a1281c" }}>
                Revisá el número: van 10 dígitos contando el código de área, sin
                el 0 ni el 15. Ejemplo: 11 2345 6789.
              </small>
            ) : (
              <small>
                Con el código de área, sin el 0 ni el 15. Lo usamos solo para
                avisarte de tus pedidos.
              </small>
            )}
          </label>
        )}

        {!esRecuperar && (
        <label className="auth-campo">
          Contraseña
          <div className="auth-campo__password">
            <input
              type={verPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={alPresionar}
              autoComplete={esRegistro ? "new-password" : "current-password"}
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              aria-label={verPassword ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {verPassword ? "🙈" : "👁"}
            </button>
          </div>
          {esRegistro && <small>Mínimo 8 caracteres.</small>}
        </label>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button
          className="auth-btn auth-btn--principal"
          onClick={esRecuperar ? pedirReset : enviar}
          disabled={enviando || (esRecuperar ? !emailOk : !listo)}
        >
          {enviando
            ? "Un momento..."
            : esRecuperar
            ? "Mandarme el enlace"
            : esRegistro
            ? "Crear mi cuenta"
            : "Entrar"}
        </button>

        <p className="auth-modal__cambiar">
          {esRecuperar ? (
            <button onClick={() => abrirModal("login")}>Volver a entrar</button>
          ) : (
            <>
              {esRegistro ? "¿Ya tenés cuenta?" : "¿Todavía no tenés cuenta?"}{" "}
              <button onClick={() => abrirModal(esRegistro ? "login" : "registro")}>
                {esRegistro ? "Iniciar sesión" : "Registrate"}
              </button>
            </>
          )}
        </p>
        </>
        )}

        {!esRegistro && !esRecuperar && (
          <p className="auth-modal__ayuda">
            <button onClick={() => abrirModal("recuperar")}>
              ¿Olvidaste tu contraseña?
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
