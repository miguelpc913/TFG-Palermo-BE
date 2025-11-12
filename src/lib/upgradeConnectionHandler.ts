// in server.ts where you handle httpServer.on('upgrade', ...)
import url from "node:url"
import { verifyJwt } from "./jwt.js"
import http from "http"
import Stream from "node:stream"
import { WebSocket, WebSocketServer } from "ws"

const upgradeConnectionHandler = async (
  request: http.IncomingMessage,
  socket: Stream.Duplex,
  head: Buffer<ArrayBufferLike>,
  wss: WebSocketServer,
) => {
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

    if (!token) throw new Error("Missing token")
    const payload = verifyJwt(token) // throws if invalid
    // @ts-expect-error Stash user info on request for use in 'connection' handler
    request.user = { id: payload.sub, email: payload.email }

    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      // @ts-expect-error attach user info on websocket
      ws.user = request.user
      wss.emit("connection", ws, request)
      console.log("connected")
    })
  } catch {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n")
    socket.destroy()
  }
}

export default upgradeConnectionHandler
