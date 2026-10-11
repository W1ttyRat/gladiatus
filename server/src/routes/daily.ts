import { Router } from "express";
import { pool } from "../db/pool.js";
import { MAX_AP } from "../game/rules.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { characterDto, loadCharacter } from "../services/character.js";

export const dailyRouter = Router();
dailyRouter.use(requireAuth);

export const DAILY_AP_BONUS = 5;
export const MAX_STREAK_MULTIPLIER = 7;

/** Gold grows with your level and with consecutive days, up to day 7. */
export const dailyGold = (level: number, streak: number) => (25 + 5 * level) * Math.min(streak, MAX_STREAK_MULTIPLIER);

dailyRouter.get("/daily", async (req: AuthedRequest, res) => {
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  const d = (
    await pool.query(
      `SELECT daily_streak AS streak, (last_daily_claim = CURRENT_DATE) AS "claimedToday",
              (last_daily_claim = CURRENT_DATE - 1) AS continues
         FROM characters WHERE id = $1`,
      [c.id],
    )
  ).rows[0];
  const nextStreak = d.claimedToday || d.continues ? d.streak + 1 : 1;
  res.json({
    streak: d.claimedToday || d.continues ? d.streak : 0,
    claimedToday: !!d.claimedToday,
    nextStreak,
    nextGold: dailyGold(c.level, nextStreak),
    apBonus: DAILY_AP_BONUS,
  });
});

dailyRouter.post("/daily/claim", async (req: AuthedRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true);
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    // the date comparison is the guard: a second claim on the same day matches no row
    const r = await client.query(
      `UPDATE characters
          SET daily_streak = CASE WHEN last_daily_claim = CURRENT_DATE - 1 THEN daily_streak + 1 ELSE 1 END,
              last_daily_claim = CURRENT_DATE
        WHERE id = $1 AND last_daily_claim IS DISTINCT FROM CURRENT_DATE
        RETURNING daily_streak AS streak`,
      [c.id],
    );
    if (r.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "You already claimed today's reward. Come back tomorrow!" });
    }
    const streak = r.rows[0].streak as number;
    const gold = dailyGold(c.level, streak);
    await client.query("UPDATE characters SET gold = gold + $1, ap = $2, ap_updated_at = $3 WHERE id = $4", [
      gold, Math.min(MAX_AP, c.ap + DAILY_AP_BONUS), c.ap_updated_at, c.id,
    ]);
    await client.query("COMMIT");
    res.json({ character: characterDto((await loadCharacter(req.userId!))!), gold, streak });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
