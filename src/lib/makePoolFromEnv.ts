import { Pool } from "pg"

function makePoolFromEnv(): Pool {
  const url = process.env.DATABASE_URL
  if (url) {
    // Neon needs TLS; keep rejectUnauthorized=false for simplicity (use a CA in real prod)
    return new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    })
  }

  const {
    DB_HOST = "postgres",
    DB_PORT = "5432",
    DB_USER = "postgres",
    DB_PASSWORD = "postgres",
    DB_NAME = "automerge_repo",
    DB_SSLMODE,
  } = process.env

  return new Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl:
      DB_SSLMODE?.toLowerCase() === "require"
        ? { rejectUnauthorized: false }
        : undefined,
  })
}

export default makePoolFromEnv
