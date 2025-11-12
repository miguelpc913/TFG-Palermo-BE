import { Router } from "express"

const router = Router()

router.get("/", (_req, res) => {
  res.send("👍 @automerge/automerge-repo-sync-server is running")
})

export default router
