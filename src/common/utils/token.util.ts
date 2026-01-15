import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload';

const JWT_ACCESS_SECRET=process.env.JWT_SECRET || "2b8e7f9c4d5a6e8f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7";


export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '24h' });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function signRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

export async function hashToken(token: string) {
  const saltRounds = 10;
  return bcrypt.hash(token, saltRounds);
}

export async function compareHash(token: string, hash: string) {
  return bcrypt.compare(token, hash);
}
