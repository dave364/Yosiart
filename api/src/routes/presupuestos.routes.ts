import { Router } from "express";
import { autenticacionOpcional, requiereAdmin } from "../middleware/auth.ts";
import * as presupuestos from "../controllers/presupuestos.controller.ts";

export const router = Router();

router.post("/", autenticacionOpcional, presupuestos.crear);
router.get("/", requiereAdmin, presupuestos.listar);
router.patch("/:id", requiereAdmin, presupuestos.responder);
