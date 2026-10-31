import { useState } from "react";
import type { KeyboardEvent } from "react";
import "../Auth/AuthModal.scss";
import { mensajeDe } from "../../tipos";
import { cambiarPassword } from "../../services/auth.service";

// Pantalla que abre el enlace del correo: /#reset=EL_TOKEN
const Reset = ({ token }: { token: string }) => {
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  const coinciden = password.length >= 10 && password === repetir;

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await cambiarPassword(token, password);
      setListo(true);
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  };

  const alPresionar = (e: KeyboardEvent) => {
    if (e.key === "Enter" && coinciden && !enviando) enviar();
  };

  // Al volver a la tienda limpiamos el token de la barra de direcciones:
  // no queremos que quede en el historial ni que se comparta por error.
  const volver = () => {
    window.location.hash = "";
    window.location.reload();
  };

  return (
    <div className="auth-overlay" style={{ position: "static", minHeight: "100vh" }}>
      <div className="auth-modal">
        {listo ? (
          <>
            <h2>Contrasena cambiada</h2>
            <p style={{ textAlign: "center", margin: "0 0 18px", lineHeight: 1.6 }}>
              Ya podes entrar con tu contrasena nueva.
            </p>
            <button className="auth-btn auth-btn--principal" onClick={volver}>
              Ir a la tienda
            </button>
          </>
        ) : (
          <>
            <h2>Elegi una contrasena nueva</h2>

            <label className="auth-campo">
              Contrasena nueva
              <div className="auth-campo__password">
                <input
                  type={ver ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={alPresionar}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setVer((v) => !v)}>
                  {ver ? "\u{1F648}" : "\u{1F441}"}
                </button>
              </div>
              <small>Mínimo 10 caracteres.</small>
            </label>

            <label className="auth-campo">
              Repetila
              <input
                type={ver ? "text" : "password"}
                value={repetir}
                onChange={(e) => setRepetir(e.target.value)}
                onKeyDown={alPresionar}
                autoComplete="new-password"
              />
              {repetir.length > 0 && password !== repetir && (
                <small style={{ color: "#a1281c" }}>Las dos no coinciden.</small>
              )}
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button
              className="auth-btn auth-btn--principal"
              onClick={enviar}
              disabled={!coinciden || enviando}
            >
              {enviando ? "Guardando..." : "Guardar"}
            </button>

            <p className="auth-modal__cambiar">
              <button onClick={volver}>Volver a la tienda</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Reset;
