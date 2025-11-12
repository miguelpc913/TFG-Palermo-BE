import http from "http"
import { WebSocket, WebSocketServer } from "ws"
import { once } from "events"
import { createApp } from "./express.js"
import initAutomergeRepo from "./initAutomergeRepo.js"
import upgradeConnectionHandler from "./lib/upgradeConnectionHandler.js"

export type RunningServer = {
  start: () => Promise<void>
  stop: () => Promise<void>
  ready: () => Promise<void>
}

export function createSyncServer(): RunningServer {
  const port = process.env.PORT ? Number(process.env.PORT) : 3030
  const wss = new WebSocketServer({ noServer: true })
  const repo = initAutomergeRepo(wss)
  const app = createApp(repo)
  const httpServer = http.createServer(app)

  httpServer.on("upgrade", (request, socket, head) => {
    upgradeConnectionHandler(request, socket, head, wss)
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
