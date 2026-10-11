import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { authRouter } from "./routes/auth.js";
import { gameRouter } from "./routes/game.js";
import { characterRouter } from "./routes/character.js";
import { inventoryRouter } from "./routes/inventory.js";
import { questRouter } from "./routes/quests.js";
import { shopRouter } from "./routes/shop.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api", gameRouter);
app.use("/api", inventoryRouter);
app.use("/api", shopRouter);
app.use("/api", questRouter);
app.use("/api", characterRouter);

// Express 5 forwards rejected async handlers here.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
