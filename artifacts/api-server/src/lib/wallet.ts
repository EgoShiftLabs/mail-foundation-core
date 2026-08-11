import bs58 from "bs58";

/** A valid Solana wallet address is a base58-encoded 32-byte public key. */
export function isValidWalletAddress(address: unknown): address is string {
  if (typeof address !== "string") return false;
  if (address.length < 32 || address.length > 44) return false;
  try {
    return bs58.decode(address).length === 32;
  } catch {
    return false;
  }
}

/**
 * Deterministic system wallet used as the sender of the welcome delivery.
 * Not a real keypair holder — just a stable, valid base58 address.
 */
export const POSTMASTER_WALLET = bs58.encode(Buffer.alloc(32, 9));
