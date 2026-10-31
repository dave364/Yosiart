// Catálogo: /api/productos
import { pedirApi } from "./api";
import type { ProductoApi } from "../tipos";

export const listarProductos = () => pedirApi<ProductoApi[]>("/api/productos");
