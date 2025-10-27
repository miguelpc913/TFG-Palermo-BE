import fs from "fs"
import path from "path"
import os from "os"
import http, { IncomingMessage, Server as HttpServer } from "http"
import express, { Express } from "express"
import { WebSocket, WebSocketServer } from "ws"
import { once } from "events"
import {
  NetworkAdapterInterface,
  PeerId,
  Repo,
} from "@automerge/automerge-repo"
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket"
import type { WebSocketServer as IsoWSS } from "isomorphic-ws"
import { PostgresStorageAdapter } from "./PostgresStorageAdapter.js"
import { NodeFSStorageAdapter } from "./NodeFileSystemAdapter.js"

type ServerDeps = {
  port?: number
  dataDir?: string
  staticDir?: string | false // pass false to disable static
  logger?: (msg: string) => void
  // allow passing your own Express/HTTP instances for tests
  app?: Express
  httpServer?: HttpServer
}

export type RunningServer = {
  app: Express
  httpServer: HttpServer
  wss: WebSocketServer
  repo: Repo
  start: () => Promise<void>
  stop: () => Promise<void>
  ready: () => Promise<void>
}

export function createSyncServer(deps: ServerDeps = {}): RunningServer {
  const {
    port = process.env.PORT ? Number(process.env.PORT) : 3030,
    dataDir = process.env.DATA_DIR ?? ".amrg",
    staticDir = "public",
    logger = (m) => console.log(m),
    app = express(),
    httpServer = http.createServer(app),
  } = deps

  // Ensure storage path
  fs.mkdirSync(path.resolve(dataDir), { recursive: true })

  // App routes/middleware (optional static)
  if (staticDir !== false) app.use(express.static(staticDir))
  app.get("/", (_req, res) =>
    res.send("👍 @automerge/automerge-repo-sync-server is running"),
  )

  // WebSocket server, noServer so we can control upgrade
  const wss = new WebSocketServer({ noServer: true })

  // Wire HTTP → WS upgrade
  httpServer.on("upgrade", (request: IncomingMessage, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      wss.emit("connection", ws, request)
    })
  })

  // Automerge repo
  const hostname = os.hostname()
  const networkAdapters: NetworkAdapterInterface[] = [
    new NodeWSServerAdapter(
      wss as unknown as IsoWSS,
    ) as unknown as NetworkAdapterInterface,
  ]

  const storage = new PostgresStorageAdapter({
    tableName: "amrg_chunks",
    ensureTable: true,
  })
  const repo = new Repo({
    network: networkAdapters,
    storage: storage,
    peerId: `storage-server-${hostname}` as PeerId,
    sharePolicy: async () => false,
  })

  // Lifecycle controls
  let started = false
  let closed = false

  async function start() {
    if (started) return
    httpServer.listen(port)
    // Wait for 'listening' in a promise-friendly way
    await once(httpServer, "listening")
    started = true
    logger(`Listening on port ${port}`)
  }

  async function stop() {
    if (closed) return
    // Stop accepting new connections
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
    // Close all WS clients
    await new Promise<void>((resolve) => {
      // Graceful close: give clients a moment to finish
      const timer = setTimeout(() => resolve(), 1000)
      wss.clients.forEach((client) => {
        try {
          client.terminate()
        } catch {}
      })
      wss.close(() => {
        clearTimeout(timer)
        resolve()
      })
    })
    closed = true
    logger("Server stopped")
  }

  async function ready() {
    if (started) return
    // If not started, calling ready() implies start is desired.
    // If you prefer "ready means listening", we can just await 'listening'.
    await start()
  }

  // Optional: SIGINT/SIGTERM graceful shutdown hook
  const onSignal = async () => {
    logger("Received shutdown signal")
    await stop()
    process.exit(0)
  }
  process.once("SIGINT", onSignal)
  process.once("SIGTERM", onSignal)

  return { app, httpServer, wss, repo, start, stop, ready }
}
