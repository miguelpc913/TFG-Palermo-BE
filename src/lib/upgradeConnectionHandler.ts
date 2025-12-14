// in server.ts where you handle httpServer.on('upgrade', ...)
import url from "node:url"
import { verifyJwt } from "./jwt.js"
import http from "http"
import Stream from "node:stream"
import { WebSocket, WebSocketServer } from "ws"

const upgradeConnectionHandler = async (
  request: http.IncomingMessage,
  socket: Stream.Duplex,
  head: Buffer,
  wss: WebSocketServer,
) => {
  wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
    try {
      // Accept token via query (?token=) or Sec-WebSocket-Protocol: bearer,<token>
      const { searchParams } = new url.URL(request.url!, "http://localhost")
      let token = searchParams.get("token")

      if (!token) {
        const proto = request.headers["sec-websocket-protocol"]
        if (typeof proto === "string") {
          token = proto.split(",")[1].trim()
        }
      }
      try {
        if (!token) throw new Error("Missing token")
        const payload = verifyJwt(token) // throws if invalid
        // @ts-expect-error Stash user info on request for use in 'connection' handler
        request.user = { id: payload.sub, email: payload.email }

        // @ts-expect-error attach user info on websocket
        ws.user = request.user
        wss.emit("connection", ws, request)
      } catch (e) {
        throw new Error("Auth error")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.log(errorMessage)
      ws.close(1008, errorMessage)
    }
  })
}

export default upgradeConnectionHandler
