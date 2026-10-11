import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { STAT_KEYS } from "../game/stats.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { characterDto, loadCharacter } from "../services/character.js";

export const characterRouter = Router();
characterRouter.use(requireAuth);

const allocate = z.object({ stat: z.enum(STAT_KEYS), amount: z.number().int().min(1).max(100) });

/** Spend unspent stat points (gained on level-up) on one stat. */
characterRouter.post("/stats/allocate", async (req: AuthedRequest, res) => {
  const parsed = allocate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid stat or amount" });
  const { stat, amount } = parsed.data;
  // stat comes from a fixed enum, so interpolating the column name is safe; the WHERE guards the balance
  const r = await pool.query(
    `UPDATE characters c SET ${stat} = ${stat} + $1, stat_points = stat_points - $1
      WHERE user_id = $2 AND stat_points >= $1`,
    [amount, req.userId],
  );
  if (r.rowCount === 0) return res.status(400).json({ error: "Not enough stat points" });
  res.json(characterDto((await loadCharacter(req.userId!))!));
});

characterRouter.get("/rankings", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT u.username, c.level, c.xp, c.gold, c.arena_rating AS "arenaRating",
            (SELECT COUNT(*)::int FROM progress p WHERE p.character_id = c.id) AS "enemiesDefeated"
       FROM characters c JOIN users u ON u.id = c.user_id
      ORDER BY c.level DESC, c.xp DESC LIMIT 50`,
  );
  res.json(rows);
});
