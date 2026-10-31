import { Router } from "express";
import * as fotos from "../controllers/fotos.controller.js";

export const router = Router();

router.get("/:id", fotos.ver);
