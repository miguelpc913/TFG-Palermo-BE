import { Request, Response, NextFunction } from "express"

export default function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const message = err instanceof Error ? err.message : "Internal Server Error"
  res.status(500).json({ error: message })
}
