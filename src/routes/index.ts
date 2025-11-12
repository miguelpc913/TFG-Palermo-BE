import { Router } from "express"
import rootRouter from "./root.js"
import authRouter from "./auth.js"
const router = Router()

// Public/simple routes
router.use("/", rootRouter)
router.use("/auth", authRouter)
export default router
