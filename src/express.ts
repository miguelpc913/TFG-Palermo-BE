import express, { Express } from "express"
import path from "path"
import routes from "./routes/index.js"
import notFound from "./middleware/notFound.js"
import errorHandler from "./middleware/errorHandler.js"
import { Repo } from "@automerge/automerge-repo"
import cors from "cors"

const staticDir = "public"

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())

const corsOptions: cors.CorsOptions = {
  origin(origin, cb) {
    // allow non-browser tools (e.g., curl, Postman) where origin is undefined
    if (!origin) return cb(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true, // if you use cookies or want browsers to expose responses to auth'ed requests
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
  ],
  exposedHeaders: ["Content-Length", "Content-Disposition"],
  optionsSuccessStatus: 204,
}

export function createApp(repo: Repo): Express {
  const app = express()
  app.locals.repo = repo
  app.use(cors(corsOptions))
  app.options("*", cors(corsOptions))
  // Core middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))

  // Static (optional)
  app.use(express.static(path.resolve(staticDir)))

  // Routes
  app.use(routes) // mounts /, /health, /api, etc.

  // 404 + Error handling
  app.use(notFound)
  app.use(errorHandler)

  return app
}
