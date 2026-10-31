// Pedidos de presupuesto: /api/presupuestos
import { pedirApi } from "./api";

export const enviarPresupuesto = (datos, token) =>
  pedirApi("/api/presupuestos", {
    method: "POST",
    body: datos,
    token,
    porDefecto: "No pudimos enviar tu pedido de presupuesto.",
  });
