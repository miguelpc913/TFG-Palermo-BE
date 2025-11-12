import jwt from "jsonwebtoken"

const SECRET = process.env.JWT_SECRET!
const EXPIRES_IN = process.env.JWT_EXPIRES

export type JwtPayload = { sub: string; email: string }

export function signJwt(payload: JwtPayload): string {
  const expiresIn = parseInt(EXPIRES_IN || "129000")
  return jwt.sign(payload, SECRET, { expiresIn: expiresIn })
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}
