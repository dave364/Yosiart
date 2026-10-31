// Catálogo: /api/productos
import { pedirApi } from "./api";

export const listarProductos = () => pedirApi("/api/productos");
