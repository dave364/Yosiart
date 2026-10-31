// Pedidos: /api/pedidos
import { pedirApi } from "./api";

// El precio lo calcula el servidor: solo se manda pieza, cantidad y personalización.
export const crearPedido = (pedido, token) =>
  pedirApi("/api/pedidos", { method: "POST", body: pedido, token, porDefecto: "No pudimos registrar el pedido." });

export const misPedidos = (token) => pedirApi("/api/pedidos/mis", { token });

export const buscarPedido = (numero, email) =>
  pedirApi(`/api/pedidos/seguimiento?${new URLSearchParams({ numero, email })}`, {
    porDefecto: "No pudimos buscar el pedido.",
  });
