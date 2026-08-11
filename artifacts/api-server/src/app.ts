import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Behind the deployment edge proxy. The proxy strips client-supplied
// X-Forwarded-For and appends the real client chain, so req.ip is a
// trustworthy, unspoofable client address used for rate limiting.
app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(cookieParser());
// Bound request bodies. The largest legitimate payload is a 4000-char
// message; 32kb leaves generous headroom while refusing oversized floods.
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));

// Conservative security headers for a JSON API.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.use("/api", router);

// Central error handler. Logs server-side detail but never returns stack
// traces or internal error text to the client (avoids info disclosure).
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  req.log?.error({ err }, "Unhandled request error");
  if (res.headersSent) {
    next(err);
    return;
  }
  const status =
    typeof (err as { status?: unknown })?.status === "number"
      ? (err as { status: number }).status
      : typeof (err as { statusCode?: unknown })?.statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : 500;
  res.status(status).json({
    message:
      status < 500
        ? "That request couldn't be processed."
        : "Something went wrong. Please try again.",
  });
});

export default app;
