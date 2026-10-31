// Pedidos de presupuesto: /api/presupuestos
import { pedirApi } from "./api";

export interface NuevoPresupuesto {
  nombre: string;
  email: string;
  telefono: string | null;
  tipo: string;
  cantidad: number | null;
  fecha: string;
  descripcion: string;
  fotos: string[];
}

export const enviarPresupuesto = (datos: NuevoPresupuesto, token: string | null) =>
  pedirApi<{ id: number; estado: string }>("/api/presupuestos", {
    method: "POST",
    body: datos,
    token,
    porDefecto: "No pudimos enviar tu pedido de presupuesto.",
  });
