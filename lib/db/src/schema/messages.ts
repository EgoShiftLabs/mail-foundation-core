import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * A piece of mail addressed to a Solana wallet.
 *
 * The recipient does NOT need to be a $MAIL user — mail is stored as
 * "addressed" to any valid wallet and surfaces when that wallet
 * authenticates later.
 *
 * State semantics (never conflate):
 * - addressed: recorded for the recipient (createdAt / addressedAt)
 * - delivered: surfaced on a $MAIL surface the recipient accessed (deliveredAt)
 * - opened: the authenticated recipient opened it (openedAt)
 */
export const messagesTable = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderWallet: text("sender_wallet").notNull(),
    recipientWallet: text("recipient_wallet").notNull(),
    body: text("body").notNull(),
    /** Recipient-side placement: mailbox | requests | junk */
    folder: text("folder").notNull().default("requests"),
    /** Sender proved wallet ownership by signature at send time */
    senderVerified: boolean("sender_verified").notNull().default(false),
    containsUrl: boolean("contains_url").notNull().default(false),
    urlDomains: text("url_domains").array().notNull().default([]),
    /** Root message id of the correspondence thread */
    threadId: uuid("thread_id").notNull(),
    replyToMessageId: uuid("reply_to_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
  },
  (t) => [
    index("messages_recipient_idx").on(t.recipientWallet),
    index("messages_sender_idx").on(t.senderWallet),
    index("messages_thread_idx").on(t.threadId),
  ],
);

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageRow = typeof messagesTable.$inferSelect;
