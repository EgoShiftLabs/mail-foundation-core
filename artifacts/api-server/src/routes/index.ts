import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import mailboxRouter from "./mailbox";
import messagesRouter from "./messages";
import safetyRouter from "./safety";
import preferencesRouter from "./preferences";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(mailboxRouter);
router.use(messagesRouter);
router.use(safetyRouter);
router.use(preferencesRouter);

export default router;
