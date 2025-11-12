import { Pool } from "pg"

export type User = {
  id: string
  email: string
  password_hash: string
  root_doc_url: string
}

export default function userService(pool: Pool) {
  return {
    async findByEmail(email: string): Promise<User | null> {
      const { rows } = await pool.query(
        "SELECT id, email, password_hash, root_doc_url FROM users WHERE email=$1 LIMIT 1",
        [email],
      )
      return rows[0] ?? null
    },

    async create(
      email: string,
      password_hash: string,
      rootDocUrl: string,
    ): Promise<User> {
      const { rows } = await pool.query(
        `INSERT INTO users(email, password_hash, root_doc_url)
         VALUES ($1,$2,$3)
         RETURNING id, email, password_hash, root_doc_url`,
        [email, password_hash, rootDocUrl],
      )
      return rows[0]
    },
  }
}
