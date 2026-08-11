import type { MessageRow } from "@workspace/db";

/**
 * Shape a DB row into the API Message from the viewer's perspective.
 *
 * Honest state semantics:
 * - addressed: recorded for the recipient wallet
 * - delivered: surfaced on a $MAIL surface the recipient accessed
 * - opened: the authenticated recipient opened it
 */
export function toMessageDto(row: MessageRow, viewerWallet: string) {
  const isOutgoing =
    row.senderWallet === viewerWallet &&
    row.recipientWallet !== viewerWallet;
  return {
    id: row.id,
    senderWallet: row.senderWallet,
    recipientWallet: row.recipientWallet,
    body: row.body,
    folder: isOutgoing ? "sent" : row.folder,
    status: row.openedAt ? "opened" : row.deliveredAt ? "delivered" : "addressed",
    senderVerified: row.senderVerified,
    containsUrl: row.containsUrl,
    urlDomains: row.urlDomains,
    threadId: row.threadId,
    replyToMessageId: row.replyToMessageId ?? null,
    createdAt: row.createdAt.toISOString(),
    deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
    openedAt: row.openedAt ? row.openedAt.toISOString() : null,
    isOutgoing,
  };
}
