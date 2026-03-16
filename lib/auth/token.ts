import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;
const EXPIRY = "7d";

export interface TokenPayload {
  userId: string;
}

export function issueToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}
