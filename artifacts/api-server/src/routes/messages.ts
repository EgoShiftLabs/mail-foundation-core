import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { and, asc, desc, eq, isNull, ne, or } from "drizzle-orm";
import {
  db,
  messagesTable,
  approvedSendersTable,
  blockedWalletsTable,
  mailboxPreferencesTable,
} from "@workspace/db";
import {
  ListMessagesQueryParams,
  ListMessagesResponse,
  SendMessageBody,
  SendMessageResponse,
  GetMessageParams,
  GetMessageResponse,
  GetMessageThreadParams,
  GetMessageThreadResponse,
  OpenMessageParams,
  OpenMessageResponse,
  AcceptMessageParams,
  AcceptMessageResponse,
  JunkMessageParams,
  JunkMessageResponse,
  GetShareCardParams,
  GetShareCardResponse,
} from "@workspace/api-zod";
import { requireWallet } from "../lib/session";
import { isValidWalletAddress } from "../lib/wallet";
import { isUuid } from "../lib/ids";
import { limiters } from "../lib/rateLimit";
import { detectLinks } from "../lib/links";
import { toMessageDto } from "../lib/dto";

const router: IRouter = Router();

const NOT_FOUND = { message: "That delivery couldn't be found." };

async function findMessageForViewer(id: string, wallet: string) {
  const [row] = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.id, id),
        or(
          eq(messagesTable.senderWallet, wallet),
          eq(messagesTable.recipientWallet, wallet),
        ),
      ),
    );
  return row;
}

router.get("/messages", async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;

  const query = ListMessagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ message: "Unknown mail folder." });
    return;
  }
  const { folder } = query.data;

  if (folder === "sent") {
    const rows = await db
      .select()
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.senderWallet, wallet),
          ne(messagesTable.recipientWallet, wallet),
        ),
      )
      .orderBy(desc(messagesTable.createdAt));
    res.json(
      ListMessagesResponse.parse(rows.map((r) => toMessageDto(r, wallet))),
    );
    return;
  }

  // Surfacing incoming mail on an authenticated $MAIL surface = delivered
  await db
    .update(messagesTable)
    .set({ deliveredAt: new Date() })
    .where(
      and(
        eq(messagesTable.recipientWallet, wallet),
        eq(messagesTable.folder, folder),
        isNull(messagesTable.deliveredAt),
      ),
    );

  const rows = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.recipientWallet, wallet),
        eq(messagesTable.folder, folder),
      ),
    )
    .orderBy(desc(messagesTable.createdAt));

  res.json(
    ListMessagesResponse.parse(rows.map((r) => toMessageDto(r, wallet))),
  );
});

router.post("/messages", limiters.send, async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Your letter needs a message inside." });
    return;
  }
  const { recipientWallet, body, replyToMessageId } = parsed.data;

  if (!isValidWalletAddress(recipientWallet)) {
    res.status(400).json({ message: "THAT ADDRESS DOESN'T LOOK RIGHT." });
    return;
  }
  if (body.trim().length === 0) {
    res.status(400).json({ message: "Your letter needs a message inside." });
    return;
  }

  // Recipient has blocked this sender
  const [blocked] = await db
    .select()
    .from(blockedWalletsTable)
    .where(
      and(
        eq(blockedWalletsTable.ownerWallet, recipientWallet),
        eq(blockedWalletsTable.blockedWallet, wallet),
      ),
    );
  if (blocked) {
    res.status(403).json({ message: "RETURN TO SENDER." });
    return;
  }

  // Threading: replies stay in the parent's thread
  let threadId: string = crypto.randomUUID();
  let replyRef: string | null = null;
  const id = threadId;
  if (replyToMessageId) {
    if (!isUuid(replyToMessageId)) {
      res.status(400).json({ message: "That letter no longer exists." });
      return;
    }
    const parent = await findMessageForViewer(replyToMessageId, wallet);
    if (!parent) {
      res.status(400).json({ message: "That letter no longer exists." });
      return;
    }
    threadId = parent.threadId;
    replyRef = parent.id;
  }

  // Placement in the recipient's mailbox
  let folder = "requests";
  if (recipientWallet === wallet) {
    folder = "mailbox";
  } else {
    const [approved] = await db
      .select()
      .from(approvedSendersTable)
      .where(
        and(
          eq(approvedSendersTable.ownerWallet, recipientWallet),
          eq(approvedSendersTable.senderWallet, wallet),
        ),
      );
    if (approved) {
      folder = "mailbox";
    } else {
      const [prefs] = await db
        .select()
        .from(mailboxPreferencesTable)
        .where(eq(mailboxPreferencesTable.wallet, recipientWallet));
      folder = prefs?.unknownSenderHandling ?? "requests";
    }
  }

  const links = detectLinks(body);

  const [row] = await db
    .insert(messagesTable)
    .values({
      id,
      threadId,
      replyToMessageId: replyRef,
      senderWallet: wallet,
      recipientWallet,
      body,
      folder,
      senderVerified: true, // sender proved wallet ownership at sign-in
      containsUrl: links.containsUrl,
      urlDomains: links.urlDomains,
    })
    .returning();

  // Writing to someone approves their replies into your Mailbox
  if (recipientWallet !== wallet) {
    await db
      .insert(approvedSendersTable)
      .values({ ownerWallet: wallet, senderWallet: recipientWallet })
      .onConflictDoNothing();
  }

  res.status(201).json(SendMessageResponse.parse(toMessageDto(row!, wallet)));
});

router.get("/messages/:id", async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;
  const params = GetMessageParams.safeParse(req.params);
  if (!params.success || !isUuid(params.data.id)) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const row = await findMessageForViewer(params.data.id, wallet);
  if (!row) {
    res.status(404).json(NOT_FOUND);
    return;
  }

  // Viewing detail as recipient surfaces the delivery
  if (row.recipientWallet === wallet && !row.deliveredAt) {
    const [updated] = await db
      .update(messagesTable)
      .set({ deliveredAt: new Date() })
      .where(eq(messagesTable.id, row.id))
      .returning();
    res.json(GetMessageResponse.parse(toMessageDto(updated!, wallet)));
    return;
  }

  res.json(GetMessageResponse.parse(toMessageDto(row, wallet)));
});

router.get("/messages/:id/thread", async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;
  const params = GetMessageThreadParams.safeParse(req.params);
  if (!params.success || !isUuid(params.data.id)) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const row = await findMessageForViewer(params.data.id, wallet);
  if (!row) {
    res.status(404).json(NOT_FOUND);
    return;
  }

  const rows = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.threadId, row.threadId),
        or(
          eq(messagesTable.senderWallet, wallet),
          eq(messagesTable.recipientWallet, wallet),
        ),
      ),
    )
    .orderBy(asc(messagesTable.createdAt));

  res.json(
    GetMessageThreadResponse.parse(rows.map((r) => toMessageDto(r, wallet))),
  );
});

router.post("/messages/:id/open", async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;
  const params = OpenMessageParams.safeParse(req.params);
  if (!params.success || !isUuid(params.data.id)) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const [row] = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.id, params.data.id),
        eq(messagesTable.recipientWallet, wallet),
      ),
    );
  if (!row) {
    res.status(404).json(NOT_FOUND);
    return;
  }

  const now = new Date();
  const [updated] = await db
    .update(messagesTable)
    .set({
      deliveredAt: row.deliveredAt ?? now,
      openedAt: row.openedAt ?? now,
    })
    .where(eq(messagesTable.id, row.id))
    .returning();

  res.json(OpenMessageResponse.parse(toMessageDto(updated!, wallet)));
});

router.post("/messages/:id/accept", async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;
  const params = AcceptMessageParams.safeParse(req.params);
  if (!params.success || !isUuid(params.data.id)) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const [row] = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.id, params.data.id),
        eq(messagesTable.recipientWallet, wallet),
      ),
    );
  if (!row) {
    res.status(404).json(NOT_FOUND);
    return;
  }

  const [updated] = await db
    .update(messagesTable)
    .set({ folder: "mailbox" })
    .where(eq(messagesTable.id, row.id))
    .returning();

  // Accepting establishes approved correspondence
  await db
    .insert(approvedSendersTable)
    .values({ ownerWallet: wallet, senderWallet: row.senderWallet })
    .onConflictDoNothing();

  res.json(AcceptMessageResponse.parse(toMessageDto(updated!, wallet)));
});

router.post("/messages/:id/junk", async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;
  const params = JunkMessageParams.safeParse(req.params);
  if (!params.success || !isUuid(params.data.id)) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const [updated] = await db
    .update(messagesTable)
    .set({ folder: "junk" })
    .where(
      and(
        eq(messagesTable.id, params.data.id),
        eq(messagesTable.recipientWallet, wallet),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.json(JunkMessageResponse.parse(toMessageDto(updated, wallet)));
});

router.get("/messages/:id/share", async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;
  const params = GetShareCardParams.safeParse(req.params);
  if (!params.success || !isUuid(params.data.id)) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const [row] = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.id, params.data.id),
        eq(messagesTable.recipientWallet, wallet),
      ),
    );
  if (!row) {
    res.status(404).json(NOT_FOUND);
    return;
  }

  // Privacy-first: the message body is never included in share card data.
  // Revealing content is an explicit, owner-side choice in the UI.
  res.json(
    GetShareCardResponse.parse({
      messageId: row.id,
      headline: "I GOT MAIL",
      deliveryType: row.senderVerified ? "SIGNED MAIL" : "STANDARD MAIL",
      senderVerified: row.senderVerified,
      receivedAt: (row.deliveredAt ?? row.createdAt).toISOString(),
      revealed: false,
      body: null,
    }),
  );
});

export default router;
