import { Router, type IRouter } from "express";
import { and, desc, eq, ne } from "drizzle-orm";
import {
  db,
  blockedWalletsTable,
  approvedSendersTable,
  messagesTable,
  reportsTable,
} from "@workspace/db";
import {
  BlockWalletBody,
  BlockWalletResponse,
  ListBlockedWalletsResponse,
  UnblockWalletParams,
  ReportSenderBody,
  ReportSenderResponse,
} from "@workspace/api-zod";
import { requireWallet } from "../lib/session";
import { isValidWalletAddress } from "../lib/wallet";
import { isUuid } from "../lib/ids";
import { limiters } from "../lib/rateLimit";

const router: IRouter = Router();

router.get("/blocked", async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;
  const rows = await db
    .select()
    .from(blockedWalletsTable)
    .where(eq(blockedWalletsTable.ownerWallet, wallet))
    .orderBy(desc(blockedWalletsTable.createdAt));
  res.json(
    ListBlockedWalletsResponse.parse(
      rows.map((r) => ({
        wallet: r.blockedWallet,
        createdAt: r.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/blocked", limiters.block, async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;
  const parsed = BlockWalletBody.safeParse(req.body);
  if (!parsed.success || !isValidWalletAddress(parsed.data.wallet)) {
    res.status(400).json({ message: "THAT ADDRESS DOESN'T LOOK RIGHT." });
    return;
  }
  const target = parsed.data.wallet;
  if (target === wallet) {
    res.status(400).json({ message: "You can't block your own mailbox." });
    return;
  }

  await db
    .insert(blockedWalletsTable)
    .values({ ownerWallet: wallet, blockedWallet: target })
    .onConflictDoNothing();

  // Existing mail from them goes to Junk; approval is revoked
  await db
    .update(messagesTable)
    .set({ folder: "junk" })
    .where(
      and(
        eq(messagesTable.recipientWallet, wallet),
        eq(messagesTable.senderWallet, target),
        ne(messagesTable.folder, "junk"),
      ),
    );
  await db
    .delete(approvedSendersTable)
    .where(
      and(
        eq(approvedSendersTable.ownerWallet, wallet),
        eq(approvedSendersTable.senderWallet, target),
      ),
    );

  res.status(201).json(
    BlockWalletResponse.parse({
      wallet: target,
      createdAt: new Date().toISOString(),
    }),
  );
});

router.delete("/blocked/:wallet", limiters.block, async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;
  const params = UnblockWalletParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "THAT ADDRESS DOESN'T LOOK RIGHT." });
    return;
  }
  await db
    .delete(blockedWalletsTable)
    .where(
      and(
        eq(blockedWalletsTable.ownerWallet, wallet),
        eq(blockedWalletsTable.blockedWallet, params.data.wallet),
      ),
    );
  res.json({ message: "Unblocked. Their mail can reach you again." });
});

router.post("/reports", limiters.report, async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;
  const parsed = ReportSenderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Tell us what's wrong with this mail." });
    return;
  }
  const { messageId, reason } = parsed.data;
  if (!isUuid(messageId)) {
    res.status(404).json({ message: "That delivery couldn't be found." });
    return;
  }

  const [message] = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.id, messageId),
        eq(messagesTable.recipientWallet, wallet),
      ),
    );
  if (!message) {
    res.status(404).json({ message: "That delivery couldn't be found." });
    return;
  }

  const [report] = await db
    .insert(reportsTable)
    .values({
      reporterWallet: wallet,
      reportedWallet: message.senderWallet,
      messageId,
      reason,
    })
    .returning();

  res.status(201).json(
    ReportSenderResponse.parse({
      id: report!.id,
      messageId: report!.messageId,
      reason: report!.reason,
      createdAt: report!.createdAt.toISOString(),
    }),
  );
});

export default router;
