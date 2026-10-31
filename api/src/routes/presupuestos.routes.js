import { Router } from "express";
import { autenticacionOpcional, requiereAdmin } from "../middleware/auth.js";
import * as presupuestos from "../controllers/presupuestos.controller.js";

export const router = Router();

router.post("/", autenticacionOpcional, presupuestos.crear);
router.get("/", requiereAdmin, presupuestos.listar);
router.patch("/:id", requiereAdmin, presupuestos.responder);
