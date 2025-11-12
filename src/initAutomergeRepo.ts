import {
  NetworkAdapterInterface,
  Repo,
  PeerId,
} from "@automerge/automerge-repo"
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket"
import { PostgresStorageAdapter } from "./PostgresStorageAdapter.js"
import os from "os"
import { WebSocketServer } from "ws"
import type { WebSocketServer as IsoWSS } from "isomorphic-ws"

const initAutomergeRepo = (wss: WebSocketServer) => {
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
  return repo
}

export default initAutomergeRepo
