import { Router } from "express";
import { autenticacionOpcional, requiereAuth, requiereAdmin } from "../middleware/auth.js";
import * as pedidos from "../controllers/pedidos.controller.js";

export const router = Router();

router.post("/", autenticacionOpcional, pedidos.crear); // con o sin cuenta
router.get("/mis", requiereAuth, pedidos.misPedidos);
router.get("/seguimiento", pedidos.seguimiento); // con número y email
router.get("/", requiereAdmin, pedidos.listar);
router.patch("/:id/estado", requiereAdmin, pedidos.cambiarEstado);
router.patch("/:id/total", requiereAdmin, pedidos.cargarTotal);
