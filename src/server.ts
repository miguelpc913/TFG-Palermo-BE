import http from "http"
import { WebSocket, WebSocketServer } from "ws"
import { once } from "events"
import { createApp } from "./express.js"
import initAutomergeRepo from "./lib/initAutomergeRepo.js"
import upgradeConnectionHandler from "./lib/upgradeConnectionHandler.js"
import { cbor } from "@automerge/automerge-repo"

export type RunningServer = {
  start: () => Promise<void>
  stop: () => Promise<void>
  ready: () => Promise<void>
}

export type SyncMessage = {
  type: string
  targetId: string
  data: Uint8Array // or Buffer on Node
  documentId: string
  senderId: string
}

export function createSyncServer(): RunningServer {
  const port = process.env.PORT ? Number(process.env.PORT) : 3030
  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols, req) => {
      // Client offers ["bearer", "<jwt>"].
      // We MUST select ONE protocol string to echo back.
      if (protocols.has("bearer")) return "bearer"
      // If you ever add other protocols, select them here.
      return false // no acceptable subprotocol -> reject
    },
  })
  const repo = initAutomergeRepo(wss)
  const app = createApp(repo)
  const httpServer = http.createServer(app)

  httpServer.on("upgrade", (request, socket, head) => {
    upgradeConnectionHandler(request, socket, head, wss)
  })
  wss.on("connection", (ws) => {
    ws.on("message", (data) => {
      const msg = cbor.decode(
        Buffer.isBuffer(data) ? data : Buffer.from(data as any),
      ) as SyncMessage
      if (msg?.type === "join") {
        ws.send(Buffer.from(cbor.encode({ type: "joined" })))
        return
      }
    })
  })

  let started = false
  let closed = false

  async function start() {
    if (started) return
    httpServer.listen(port)
    await once(httpServer, "listening")
    started = true
    console.log(`Listening on port ${port}`)
  }

  async function stop() {
    if (closed) return
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 1000)
      wss.clients.forEach((c) => {
        try {
          c.terminate()
        } catch {}
      })
      wss.close(() => {
        clearTimeout(timer)
        resolve()
      })
    })
    closed = true
    console.log("Server stopped")
  }

  async function ready() {
    if (!started) await start()
  }

  const onSignal = async () => {
    console.log("Received shutdown signal")
    await stop()
    process.exit(0)
  }

  process.once("SIGINT", onSignal)
  process.once("SIGTERM", onSignal)

  return { start, stop, ready }
}
