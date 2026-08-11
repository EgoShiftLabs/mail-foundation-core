import { Router, type IRouter } from "express";
import { and, count, eq, isNull } from "drizzle-orm";
import { db, messagesTable } from "@workspace/db";
import { GetMailboxSummaryResponse } from "@workspace/api-zod";
import { requireWallet } from "../lib/session";

const router: IRouter = Router();

router.get("/mailbox/summary", async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;

  const folderCount = async (folder: string): Promise<number> => {
    const [row] = await db
      .select({ n: count() })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.recipientWallet, wallet),
          eq(messagesTable.folder, folder),
        ),
      );
    return row?.n ?? 0;
  };

  const [mailboxCount, requestsCount, junkCount] = await Promise.all([
    folderCount("mailbox"),
    folderCount("requests"),
    folderCount("junk"),
  ]);

  const [unreadRow] = await db
    .select({ n: count() })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.recipientWallet, wallet),
        eq(messagesTable.folder, "mailbox"),
        isNull(messagesTable.openedAt),
      ),
    );
  const mailboxUnread = unreadRow?.n ?? 0;

  const [sentRow] = await db
    .select({ n: count() })
    .from(messagesTable)
    .where(eq(messagesTable.senderWallet, wallet));
  const sentCount = sentRow?.n ?? 0;

  res.json(
    GetMailboxSummaryResponse.parse({
      wallet,
      hasNewMail: mailboxUnread > 0,
      mailboxUnread,
      mailboxCount,
      requestsCount,
      junkCount,
      sentCount,
    }),
  );
});

export default router;
