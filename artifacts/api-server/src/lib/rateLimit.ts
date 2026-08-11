import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getSessionWallet } from "./session";

/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Deliberately dependency-free and single-process. $MAIL V1 runs as one
 * instance, so a shared in-memory store is sufficient. Limits reset on
 * restart and are NOT shared across instances — see SECURITY_AUDIT_V1.md
 * "Remaining risks" before scaling horizontally.
 */

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

// Hard ceiling on tracked keys so the limiter itself cannot be turned into a
// memory-exhaustion vector by a flood of unique IPs / wallets. When full we
// sweep expired entries first, then fail closed (429) rather than grow.
const MAX_ENTRIES = 50_000;

function sweepExpired(now: number): void {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

// Periodically evict expired windows so the map cannot grow without bound
// from a churn of unique keys (IPs / wallets).
const SWEEP_MS = 60_000;
const sweeper = setInterval(() => sweepExpired(Date.now()), SWEEP_MS);
sweeper.unref?.();

function hit(
  key: string,
  max: number,
  windowMs: number,
): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    // Creating a brand-new key: enforce the storage ceiling.
    if (!store.has(key) && store.size >= MAX_ENTRIES) {
      sweepExpired(now);
      if (store.size >= MAX_ENTRIES) {
        return { limited: true, retryAfterSec: 1 };
      }
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > max) {
    return {
      limited: true,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  return { limited: false, retryAfterSec: 0 };
}

export type LimitRule = {
  /** Bucket name — keep unique per endpoint+dimension. */
  name: string;
  max: number;
  windowMs: number;
  /** Identity extractor; return null to skip this rule for the request. */
  by: (req: Request) => string | null;
};

/** Identity extractors. */
export const byIp = (req: Request): string => req.ip ?? "ip:unknown";
export const byGlobal = (): string => "all";
export const byWallet = (req: Request): string | null => getSessionWallet(req);
export const byBodyWallet = (req: Request): string | null => {
  const wallet = (req.body as { wallet?: unknown } | undefined)?.wallet;
  // Cap length so a huge string can't be used as a memory-amplification key.
  return typeof wallet === "string" ? `w:${wallet.slice(0, 64)}` : null;
};

/**
 * Build a middleware enforcing one or more layered rules. The first rule
 * that trips returns 429; rules whose `by` returns null are skipped.
 */
export function rateLimit(...rules: LimitRule[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const rule of rules) {
      const id = rule.by(req);
      if (id === null) continue;
      const { limited, retryAfterSec } = hit(
        `${rule.name}:${id}`,
        rule.max,
        rule.windowMs,
      );
      if (limited) {
        res.setHeader("Retry-After", String(retryAfterSec));
        res.status(429).json({
          message: "Too many attempts. Please wait a moment and try again.",
        });
        return;
      }
    }
    next();
  };
}

const MIN = 60_000;
const HOUR = 60 * MIN;

/**
 * Endpoint limiters. Windows are conservative: generous enough that a real
 * person never hits them, tight enough to blunt automated abuse. Layered
 * IP + wallet so neither a single wallet nor a single host can flood.
 */
export const limiters = {
  // Challenge issuance writes a DB row each call — bound it per host, per
  // target wallet, and globally to cap total churn.
  challenge: rateLimit(
    // Global admission first: under a distributed flood this trips before any
    // per-IP / per-wallet key is created, closing the key-growth path.
    { name: "challenge-global", max: 600, windowMs: MIN, by: byGlobal },
    { name: "challenge-ip", max: 30, windowMs: MIN, by: byIp },
    { name: "challenge-wallet", max: 10, windowMs: MIN, by: byBodyWallet },
  ),
  // Verify is cheap but should not be hammerable (signature guessing is
  // infeasible, but this bounds load and log noise).
  verify: rateLimit(
    { name: "verify-ip", max: 60, windowMs: MIN, by: byIp },
    { name: "verify-wallet", max: 20, windowMs: MIN, by: byBodyWallet },
  ),
  // Sending is the primary spam vector — layer per-wallet burst + sustained
  // limits with a per-IP backstop for unauthenticated floods.
  send: rateLimit(
    { name: "send-ip", max: 60, windowMs: MIN, by: byIp },
    { name: "send-wallet-min", max: 20, windowMs: MIN, by: byWallet },
    { name: "send-wallet-hour", max: 200, windowMs: HOUR, by: byWallet },
  ),
  // Reports must not be spammable.
  report: rateLimit(
    { name: "report-ip", max: 60, windowMs: MIN, by: byIp },
    { name: "report-wallet-min", max: 10, windowMs: MIN, by: byWallet },
    { name: "report-wallet-hour", max: 60, windowMs: HOUR, by: byWallet },
  ),
  // Block/unblock churn guard.
  block: rateLimit(
    { name: "block-ip", max: 60, windowMs: MIN, by: byIp },
    { name: "block-wallet", max: 30, windowMs: MIN, by: byWallet },
  ),
};
