import { Router } from "express";
import { requiereAdmin } from "../middleware/auth.js";
import * as usuarios from "../controllers/usuarios.controller.js";

export const router = Router();

// Solo el administrador ve y maneja a los clientes.
router.use(requiereAdmin);
router.get("/", usuarios.listar);
router.patch("/:id/activo", usuarios.cambiarActivo);
