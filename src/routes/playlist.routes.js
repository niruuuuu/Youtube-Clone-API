import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
function a() {
  console.log("dd");
}

const router = Router()

export default router