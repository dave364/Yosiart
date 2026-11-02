import { Router } from "express";
import { requiereAdmin } from "../middleware/auth.ts";
import * as galeria from "../controllers/galeria.controller.ts";

export const router = Router();

router.get("/", galeria.listar); // público: el carrusel del inicio
router.post("/", requiereAdmin, galeria.agregar);
router.delete("/:id", requiereAdmin, galeria.borrar);
