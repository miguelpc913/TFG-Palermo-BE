import express, { Express } from "express"
import path from "path"
import routes from "./routes/index.js"
import notFound from "./middleware/notFound.js"
import errorHandler from "./middleware/errorHandler.js"
import { Repo } from "@automerge/automerge-repo"
import cors from "cors"

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

// e.g. CORS_ORIGINS="https://tfg-palermo-fe-1.onrender.com,http://localhost:1420"

const corsOptions: cors.CorsOptions = {
  // origin: ALLOWED_ORIGINS, // <— array form; cors handles matching
  origin: "*", // <— array form; cors handles matching
  credentials: false, // set true only if you use cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
  ],
  optionsSuccessStatus: 204,
}

export function createApp(repo: Repo): Express {
  const app = express()

  // (Optional) DEBUG: verify env & origin list at boot
  console.log("CORS_ORIGINS:", process.env.CORS_ORIGINS)
  console.log("ALLOWED_ORIGINS:", ALLOWED_ORIGINS)

  app.locals.repo = repo

  // CORS FIRST
  app.use(cors(corsOptions))
  app.options("*", cors(corsOptions)) // preflight for all routes

  // Body parsers
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))

  // Static
  app.use(express.static(path.resolve(".")))

  // Routes
  app.use(routes)

  // 404 + errors
  app.use(notFound)
  app.use(errorHandler)

  return app
}
