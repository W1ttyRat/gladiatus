import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// No built-in fallback: a missing secret (e.g. NODE_ENV forgotten on a deploy) must not mean forgeable tokens.
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set (see server/.env.example)");
}
export const JWT_SECRET: string = process.env.JWT_SECRET;

export interface AuthedRequest extends Request {
  userId?: number;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { sub: string };
    req.userId = Number(payload.sub);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
