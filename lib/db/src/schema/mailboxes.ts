import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Per-wallet mailbox preferences. A row is created on first sign-in. */
export const mailboxPreferencesTable = pgTable("mailbox_preferences", {
  wallet: text("wallet").primaryKey(),
  /** Where mail from unknown senders lands: requests | mailbox | junk */
  unknownSenderHandling: text("unknown_sender_handling")
    .notNull()
    .default("requests"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMailboxPreferencesSchema = createInsertSchema(
  mailboxPreferencesTable,
).omit({ createdAt: true });
export type InsertMailboxPreferences = z.infer<
  typeof insertMailboxPreferencesSchema
>;
export type MailboxPreferencesRow =
  typeof mailboxPreferencesTable.$inferSelect;

/**
 * Approved correspondence: mail from an approved sender lands directly in
 * the owner's Mailbox. Created when the owner sends mail to someone or
 * accepts a request.
 */
export const approvedSendersTable = pgTable(
  "approved_senders",
  {
    ownerWallet: text("owner_wallet").notNull(),
    senderWallet: text("sender_wallet").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.ownerWallet, t.senderWallet] })],
);

export type ApprovedSenderRow = typeof approvedSendersTable.$inferSelect;

/** Wallets the owner has blocked. Future mail from them is refused. */
export const blockedWalletsTable = pgTable(
  "blocked_wallets",
  {
    ownerWallet: text("owner_wallet").notNull(),
    blockedWallet: text("blocked_wallet").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.ownerWallet, t.blockedWallet] })],
);

export type BlockedWalletRow = typeof blockedWalletsTable.$inferSelect;
