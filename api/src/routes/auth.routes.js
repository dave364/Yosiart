import { Router } from "express";
import { requiereAuth } from "../middleware/auth.js";
import * as auth from "../controllers/auth.controller.js";

export const router = Router();

router.post("/registro", auth.registro);
router.post("/login", auth.login);
router.get("/me", requiereAuth, auth.me);
router.post("/recuperar", auth.recuperar);
router.post("/restablecer", auth.restablecer);
