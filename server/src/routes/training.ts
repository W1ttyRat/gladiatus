import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { STAT_KEYS, trainingCost, type Stats } from "../game/stats.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { characterDto, loadCharacter } from "../services/character.js";

export const trainingRouter = Router();
trainingRouter.use(requireAuth);

const costs = (c: Stats) => Object.fromEntries(STAT_KEYS.map((k) => [k, trainingCost(c[k])]));

trainingRouter.get("/training", async (req: AuthedRequest, res) => {
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  res.json({ costs: costs(c) });
});

/** Pay gold to raise one base stat by 1. */
trainingRouter.post("/training/:stat", async (req: AuthedRequest, res) => {
  const stat = z.enum(STAT_KEYS).safeParse(req.params.stat);
  if (!stat.success) return res.status(400).json({ error: "Unknown stat" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true);
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    const cost = trainingCost(c[stat.data]);
    if (c.gold < cost) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Not enough gold" });
    }
    // the column name comes from the fixed enum above
    await client.query(`UPDATE characters SET gold = gold - $1, ${stat.data} = ${stat.data} + 1 WHERE id = $2`, [cost, c.id]);
    await client.query("COMMIT");
    const fresh = (await loadCharacter(req.userId!))!;
    res.json({ character: characterDto(fresh), costs: costs(fresh) });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
