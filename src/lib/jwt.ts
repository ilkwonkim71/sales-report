import jwt from "jsonwebtoken"
import type { JwtPayload } from "@/types/auth"
import { env } from "@/lib/env"

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET)
    if (typeof decoded === "string") return null
    return decoded as JwtPayload
  } catch {
    return null
  }
}
