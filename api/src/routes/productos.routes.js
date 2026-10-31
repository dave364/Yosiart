import { Router } from "express";
import { requiereAdmin } from "../middleware/auth.js";
import * as productos from "../controllers/productos.controller.js";

export const router = Router();

router.get("/", productos.listar); // público: solo los activos
router.get("/todos", requiereAdmin, productos.listarTodos); // panel: incluye los desactivados
router.post("/", requiereAdmin, productos.crear);
router.put("/:id", requiereAdmin, productos.actualizar);
router.delete("/:id", requiereAdmin, productos.desactivar);
