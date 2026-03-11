import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "7d";

export interface TokenPayload {
  userId: string;
  businessId: string;
  role: string;
  sessionId: string;
}

export function issueAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function issueRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}

// One-time tokens (password reset, email verify)
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

// Unique ID stored inside the JWT to allow per-session revocation
export function generateSessionId(): string {
  return randomBytes(16).toString("hex");
}
