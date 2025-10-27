import { Pool } from "pg";
// ---- helpers: encode/decode each key segment so "/" never collides
const segEncode = (s) => encodeURIComponent(s);
const segDecode = (s) => decodeURIComponent(s);
// Use POSIX "/" as canonical separator (independent from OS)
const keyToPath = (key) => key.map(segEncode).join("/");
const pathToKey = (path) => path.split("/").map(segDecode);
function makePoolFromEnv() {
    const url = process.env.DATABASE_URL;
    if (url) {
        // Neon needs TLS; keep rejectUnauthorized=false for simplicity (use a CA in real prod)
        return new Pool({
            connectionString: url,
            ssl: { rejectUnauthorized: false },
        });
    }
    const { DB_HOST = "postgres", DB_PORT = "5432", DB_USER = "postgres", DB_PASSWORD = "postgres", DB_NAME = "automerge_repo", DB_SSLMODE, } = process.env;
    return new Pool({
        host: DB_HOST,
        port: Number(DB_PORT),
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        ssl: DB_SSLMODE?.toLowerCase() === "require"
            ? { rejectUnauthorized: false }
            : undefined,
    });
}
export class PostgresStorageAdapter {
    constructor(opts = {}) {
        if (opts.pool) {
            this.pool = opts.pool;
        }
        else if (opts.connectionString) {
            // If you prefer a single URL, append ?sslmode=require for Neon
            // e.g. postgres://user:pass@host:5432/db?sslmode=require
            this.pool = new Pool({
                connectionString: opts.connectionString,
                ssl: { rejectUnauthorized: false },
            });
        }
        else {
            this.pool = makePoolFromEnv();
        }
        this.table = opts.tableName ?? "amrg_chunks";
        if (opts.ensureTable)
            void this.ensureSchema();
    }
    // ---------- StorageAdapterInterface methods ----------
    async load(keyArray) {
        const keyPath = keyToPath(keyArray);
        const { rows } = await this.pool.query(`SELECT data FROM ${this.table} WHERE key_path = $1`, [keyPath]);
        if (rows.length === 0)
            return undefined;
        // pg returns BYTEA as Buffer
        return new Uint8Array(rows[0].data);
    }
    async save(keyArray, binary) {
        const keyPath = keyToPath(keyArray);
        await this.pool.query(`INSERT INTO ${this.table} (key_path, data)
		 VALUES ($1, $2)
		 ON CONFLICT (key_path)
		 DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [keyPath, Buffer.from(binary)]);
    }
    async remove(keyArray) {
        const keyPath = keyToPath(keyArray);
        await this.pool.query(`DELETE FROM ${this.table} WHERE key_path = $1`, [
            keyPath,
        ]);
    }
    async loadRange(keyPrefix) {
        // Prefix matches itself and anything below it: "prefix" OR "prefix/%"
        const prefix = keyToPath(keyPrefix);
        const { rows } = await this.pool.query(`SELECT key_path, data
		   FROM ${this.table}
		  WHERE key_path = $1
			 OR key_path LIKE $1 || '/%'`, [prefix]);
        // Map to { key, data }
        return rows.map((r) => ({
            key: pathToKey(r.key_path),
            data: new Uint8Array(r.data),
        }));
    }
    async removeRange(keyPrefix) {
        const prefix = keyToPath(keyPrefix);
        await this.pool.query(`DELETE FROM ${this.table}
		  WHERE key_path = $1
			 OR key_path LIKE $1 || '/%'`, [prefix]);
    }
    // ---------- optional helpers ----------
    /** Idempotent schema bootstrap; call once at startup if desired */
    async ensureSchema() {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(`
		  CREATE TABLE IF NOT EXISTS ${this.table} (
			key_path   TEXT PRIMARY KEY,
			data       BYTEA NOT NULL,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		  );
		`);
            await client.query(`
		  CREATE INDEX IF NOT EXISTS ${this.table}_key_path_like_idx
			ON ${this.table} (key_path text_pattern_ops);
		`);
            await client.query("COMMIT");
        }
        catch (e) {
            await client.query("ROLLBACK");
            throw e;
        }
        finally {
            client.release();
        }
    }
    /** If you created the Pool in the adapter, you can close it on shutdown */
    async close() {
        await this.pool.end();
    }
}
//# sourceMappingURL=PostgresStorageAdapter.js.map