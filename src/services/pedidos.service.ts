// Pedidos: /api/pedidos
import { pedirApi } from "./api";
import type { Opciones, Pedido } from "../tipos";

export interface NuevoPedido {
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string;
  items: { pieza_id: string; cantidad: number; personalizacion: Opciones }[];
}

// El precio lo calcula el servidor: solo se manda pieza, cantidad y personalización.
export const crearPedido = (pedido: NuevoPedido, token: string | null) =>
  pedirApi<Pedido>("/api/pedidos", { method: "POST", body: pedido, token, porDefecto: "No pudimos registrar el pedido." });

export const misPedidos = (token: string) => pedirApi<Pedido[]>("/api/pedidos/mis", { token });

export const buscarPedido = (numero: string, email: string) =>
  pedirApi<Pedido>(`/api/pedidos/seguimiento?${new URLSearchParams({ numero, email })}`, {
    porDefecto: "No pudimos buscar el pedido.",
  });
