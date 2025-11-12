import { Router } from "express"
import userService from "../services/userServices.js"
import { signJwt, verifyJwt } from "../lib/jwt.js"
import { verifyPassword, hashPassword } from "../lib/password.js"
import { Pool } from "pg"
import { Repo } from "@automerge/automerge-repo"
import { Page } from "../type/Document.js"
import makePoolFromEnv from "../lib/makePoolFromEnv.js"

const authRouter = Router()
const pool = makePoolFromEnv()
const users = userService(pool)

/** POST /api/v1/auth/login
 * body: { email, password }
 * returns: { token, rootDocUrl }
 */
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" })

  const user = await users.findByEmail(email)
  if (!user) return res.status(401).json({ error: "invalid credentials" })

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: "invalid credentials" })

  const token = signJwt({ sub: user.id, email: user.email })
  res.json({ token, rootDocUrl: user.root_doc_url })
})

authRouter.post("/test", async (req, res) => {
  const { token } = req.body ?? {}
  const payload = verifyJwt(token) // throws if invalid
  res.json(payload)
})

/** OPTIONAL: POST /api/v1/auth/register
 * body: { email, password, rootDocUrl? }  // you can create/assign one server-side
 */
authRouter.post("/register", async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" })

  const existing = await users.findByEmail(email)
  if (existing)
    return res.status(409).json({ error: "email already registered" })
  const repo = req.app.locals.repo as Repo // typed access
  const password_hash = await hashPassword(password)
  const rootDocUrl = await repo.create<Page>({ blocks: [{}], children: [] })
  const user = await users.create(email, password_hash, rootDocUrl.url)
  const token = signJwt({ sub: user.id, email: user.email })
  res.status(201).json({ token, rootDocUrl: user.root_doc_url })
})

export default authRouter
