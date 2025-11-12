import { Router } from "express"

const router = Router()

router.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "tfg-palermo-be",
    time: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

export default router
