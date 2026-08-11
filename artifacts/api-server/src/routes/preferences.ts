import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, mailboxPreferencesTable } from "@workspace/db";
import {
  GetPreferencesResponse,
  UpdatePreferencesBody,
  UpdatePreferencesResponse,
} from "@workspace/api-zod";
import { requireWallet } from "../lib/session";

const router: IRouter = Router();

router.get("/preferences", async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;
  const [prefs] = await db
    .select()
    .from(mailboxPreferencesTable)
    .where(eq(mailboxPreferencesTable.wallet, wallet));

  res.json(
    GetPreferencesResponse.parse({
      wallet,
      unknownSenderHandling: prefs?.unknownSenderHandling ?? "requests",
    }),
  );
});

router.patch("/preferences", async (req, res): Promise<void> => {
  const wallet = requireWallet(req, res);
  if (!wallet) return;
  const parsed = UpdatePreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "That setting isn't available." });
    return;
  }

  const unknownSenderHandling =
    parsed.data.unknownSenderHandling ?? "requests";

  await db
    .insert(mailboxPreferencesTable)
    .values({ wallet, unknownSenderHandling })
    .onConflictDoUpdate({
      target: mailboxPreferencesTable.wallet,
      set: { unknownSenderHandling },
    });

  res.json(
    UpdatePreferencesResponse.parse({ wallet, unknownSenderHandling }),
  );
});

export default router;
