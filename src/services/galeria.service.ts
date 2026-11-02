// Galería de trabajos terminados: /api/galeria
import { pedirApi } from "./api";
import type { FotoGaleria } from "../tipos";

export const listarGaleria = () => pedirApi<FotoGaleria[]>("/api/galeria");
