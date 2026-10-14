import { useCallback, useEffect, useState } from "react";
import { useAdminApi, fecha, telefonoLindo } from "./api";
import { plata } from "../../data/piezas";

const PanelClientes = () => {
  const api = useAdminApi();
  const [clientes, setClientes] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setClientes(await api("/api/usuarios"));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [api]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarActivo = async (c) => {
    if (c.activo && !window.confirm(`¿Suspender la cuenta de ${c.nombre}? No va a poder entrar ni hacer pedidos con su cuenta.`)) return;
    try {
      await api(`/api/usuarios/${c.id}/activo`, { method: "PATCH", body: { activo: !c.activo } });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section aria-label="Clientes" className="adm-seccion">
      {error && <p className="campo__error" role="alert">{error}</p>}
      {!clientes && !error && <p className="adm-suave">Cargando clientes…</p>}
      {clientes?.length === 0 && <p className="adm-vacio">Todavía no hay clientes con cuenta.</p>}
      {clientes?.length > 0 && (
        <div className="adm-tabla-wrap">
          <table className="adm-tabla">
            <caption className="solo-lectores">Clientes con cuenta</caption>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Contacto</th>
                <th scope="col">Desde</th>
                <th scope="col" className="adm-num">Pedidos</th>
                <th scope="col" className="adm-num">Gastado</th>
                <th scope="col">Cuenta</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.nombre}
                    {c.rol === "admin" && <span className="adm-chip adm-chip--admin">Admin</span>}
                  </td>
                  <td>
                    {c.email}
                    <br />
                    <span className="adm-suave">{telefonoLindo(c.telefono)}</span>
                  </td>
                  <td>{fecha(c.creado_en).split(",")[0]}</td>
                  <td className="adm-num">
                    {c.pedidos}
                    {c.pendientes > 0 && <span className="adm-suave"> ({c.pendientes} sin confirmar)</span>}
                  </td>
                  <td className="adm-num">{plata(c.gastado)}</td>
                  <td>
                    {c.rol !== "admin" && (
                      <button type="button" className="adm-link" onClick={() => cambiarActivo(c)}>
                        {c.activo ? "Suspender" : "Reactivar"}
                      </button>
                    )}
                    {!c.activo && <span className="adm-chip adm-chip--cancelado">Suspendida</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default PanelClientes;
