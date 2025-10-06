import fs from "fs"
import express, { Express } from "express"
import { WebSocket, WebSocketServer } from "ws"
import os from "os"
import http, { Server as HttpServer, IncomingMessage } from "http"
import { NodeFSStorageAdapter } from "./NodeFileSystemAdapter.js"
import {
  NetworkAdapterInterface,
  PeerId,
  Repo,
} from "@automerge/automerge-repo"
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket"
import { type WebSocketServer as IsomorphicFix } from "isomorphic-ws"

type ReadyResolver = () => void

export class Server {
  #socket: WebSocketServer
  #server: HttpServer
  #readyResolvers: ReadyResolver[] = []
  #isReady = false
  #repo: Repo

  constructor() {
    const dir = process.env.DATA_DIR ?? ".amrg"
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }

    const hostname = os.hostname()
    this.#socket = new WebSocketServer({ noServer: true })

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3030
    const app: Express = express()
    app.use(express.static("public"))

    const config = {
      network: [
        new NodeWSServerAdapter(
          this.#socket as IsomorphicFix,
        ) as unknown as NetworkAdapterInterface,
      ],
      storage: new NodeFSStorageAdapter(dir),
      peerId: `storage-server-${hostname}` as PeerId,
      sharePolicy: async () => false,
    }
    this.#repo = new Repo(config)

    app.get("/", (_req, res) => {
      res.send("👍 @automerge/automerge-repo-sync-server is running")
    })

    this.#server = app.listen(port, () => {
      console.log(`Listening on port ${port}`)
      this.#isReady = true
      this.#readyResolvers.forEach((resolve) => resolve())
      this.#readyResolvers = []
    })

    this.#server.on("upgrade", (request: IncomingMessage, socket, head) => {
      this.#socket.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        this.#socket.emit("connection", ws, request)
      })
    })
  }

  async ready(): Promise<true> {
    if (this.#isReady) return true as const
    return new Promise<true>((resolve) => {
      this.#readyResolvers.push(() => resolve(true))
    })
  }
  close(): void {
    this.#socket.close()
    this.#server.close()
  }
}
