import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Short-lived sign-in challenges. The wallet signs the message to prove
 * mailbox ownership. Never a transaction; no SOL moves.
 */
export const authChallengesTable = pgTable("auth_challenges", {
  nonce: text("nonce").primaryKey(),
  wallet: text("wallet").notNull(),
  message: text("message").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AuthChallengeRow = typeof authChallengesTable.$inferSelect;
