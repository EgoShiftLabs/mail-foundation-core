import crypto from "node:crypto";
import type { Request, Response } from "express";

const COOKIE_NAME = "mail_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be set");
  }
  return secret;
}

function sign(data: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");
}

export function createSessionToken(wallet: string): string {
  const payload = Buffer.from(
    JSON.stringify({ w: wallet, exp: Date.now() + SESSION_TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function getSessionWallet(req: Request): string | null {
  const token: unknown = req.cookies?.[COOKIE_NAME];
  if (typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    );
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "w" in parsed &&
      typeof parsed.w === "string" &&
      "exp" in parsed &&
      typeof parsed.exp === "number" &&
      parsed.exp > Date.now()
    ) {
      return parsed.w;
    }
    return null;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, wallet: string): void {
  res.cookie(COOKIE_NAME, createSessionToken(wallet), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

/** Standard 401 body. Returns the wallet or responds 401 and returns null. */
export function requireWallet(req: Request, res: Response): string | null {
  const wallet = getSessionWallet(req);
  if (!wallet) {
    res.status(401).json({ message: "Sign in to open your mailbox." });
    return null;
  }
  return wallet;
}
