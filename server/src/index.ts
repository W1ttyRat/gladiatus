import "dotenv/config";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { arenaRouter } from "./routes/arena.js";
import { authRouter } from "./routes/auth.js";
import { dailyRouter } from "./routes/daily.js";
import { gameRouter } from "./routes/game.js";
import { characterRouter } from "./routes/character.js";
import { inventoryRouter } from "./routes/inventory.js";
import { packageRouter } from "./routes/packages.js";
import { questRouter } from "./routes/quests.js";
import { shopRouter } from "./routes/shop.js";
import { trainingRouter } from "./routes/training.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// slow down password guessing and bcrypt abuse
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 50, standardHeaders: true, legacyHeaders: false });
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use("/api/auth", authRouter);
app.use("/api", gameRouter);
app.use("/api", inventoryRouter);
app.use("/api", shopRouter);
app.use("/api", questRouter);
app.use("/api", packageRouter);
app.use("/api", characterRouter);
app.use("/api", arenaRouter);
app.use("/api", dailyRouter);
app.use("/api", trainingRouter);

// In production the API also serves the built client (npm run build, then npm start).
const clientDist = fileURLToPath(new URL("../../client/dist/", import.meta.url));
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/{*splat}", (req, res, next) => (req.path.startsWith("/api") ? next() : res.sendFile(clientDist + "index.html")));
}

// Express 5 forwards rejected async handlers here.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
