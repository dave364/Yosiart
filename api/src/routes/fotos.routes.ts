import { Router } from "express";
import * as fotos from "../controllers/fotos.controller.ts";

export const router = Router();

router.get("/:id", fotos.ver);
