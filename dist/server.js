import fs from "fs";
import path from "path";
import os from "os";
import http, { IncomingMessage, Server as HttpServer } from "http";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import { once } from "events";
import { Repo, } from "@automerge/automerge-repo";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import { PostgresStorageAdapter } from "./PostgresStorageAdapter.js";
import { NodeFSStorageAdapter } from "./NodeFileSystemAdapter.js";
export function createSyncServer(deps = {}) {
    const { port = process.env.PORT ? Number(process.env.PORT) : 3030, dataDir = process.env.DATA_DIR ?? ".amrg", staticDir = "public", logger = (m) => console.log(m), app = express(), httpServer = http.createServer(app), } = deps;
    // Ensure storage path
    fs.mkdirSync(path.resolve(dataDir), { recursive: true });
    // App routes/middleware (optional static)
    if (staticDir !== false)
        app.use(express.static(staticDir));
    app.get("/", (_req, res) => res.send("👍 @automerge/automerge-repo-sync-server is running"));
    // WebSocket server, noServer so we can control upgrade
    const wss = new WebSocketServer({ noServer: true });
    // Wire HTTP → WS upgrade
    httpServer.on("upgrade", (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
        });
    });
    // Automerge repo
    const hostname = os.hostname();
    const networkAdapters = [
        new NodeWSServerAdapter(wss),
    ];
    const storage = new PostgresStorageAdapter({
        tableName: "amrg_chunks",
        ensureTable: true,
    });
    const repo = new Repo({
        network: networkAdapters,
        storage: storage,
        peerId: `storage-server-${hostname}`,
        sharePolicy: async () => false,
    });
    // Lifecycle controls
    let started = false;
    let closed = false;
    async function start() {
        if (started)
            return;
        httpServer.listen(port);
        // Wait for 'listening' in a promise-friendly way
        await once(httpServer, "listening");
        started = true;
        logger(`Listening on port ${port}`);
    }
    async function stop() {
        if (closed)
            return;
        // Stop accepting new connections
        await new Promise((resolve) => httpServer.close(() => resolve()));
        // Close all WS clients
        await new Promise((resolve) => {
            // Graceful close: give clients a moment to finish
            const timer = setTimeout(() => resolve(), 1000);
            wss.clients.forEach((client) => {
                try {
                    client.terminate();
                }
                catch { }
            });
            wss.close(() => {
                clearTimeout(timer);
                resolve();
            });
        });
        closed = true;
        logger("Server stopped");
    }
    async function ready() {
        if (started)
            return;
        // If not started, calling ready() implies start is desired.
        // If you prefer "ready means listening", we can just await 'listening'.
        await start();
    }
    // Optional: SIGINT/SIGTERM graceful shutdown hook
    const onSignal = async () => {
        logger("Received shutdown signal");
        await stop();
        process.exit(0);
    };
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
    return { app, httpServer, wss, repo, start, stop, ready };
}
//# sourceMappingURL=server.js.map