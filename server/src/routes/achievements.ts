import { Router } from "express";
import { pool } from "../db/pool.js";
import { ACHIEVEMENTS, type Metric } from "../game/achievements.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { characterDto, loadCharacter } from "../services/character.js";

export const achievementRouter = Router();
achievementRouter.use(requireAuth);

type Db = Pick<typeof pool, "query">;

async function metrics(db: Db, characterId: number, level: number, gold: number, rating: number): Promise<Record<Metric, number>> {
  const one = async (sql: string) => (await db.query(sql, [characterId])).rows[0].n as number;
  return {
    wins: await one(`SELECT COUNT(*)::int AS n FROM battle_logs WHERE character_id = $1 AND won AND kind = 'expedition'`),
    arenaWins: await one(`SELECT COUNT(*)::int AS n FROM battle_logs WHERE character_id = $1 AND won AND kind = 'arena'`),
    bosses: await one(`SELECT COUNT(*)::int AS n FROM progress p JOIN enemies e ON e.id = p.enemy_id WHERE p.character_id = $1 AND e.is_boss`),
    quests: await one(`SELECT COUNT(*)::int AS n FROM character_quests WHERE character_id = $1 AND status = 'claimed'`),
    level, gold, rating,
  };
}

async function list(db: Db, characterId: number, level: number, gold: number, rating: number) {
  const m = await metrics(db, characterId, level, gold, rating);
  const claimed = new Set(
    (await db.query("SELECT achievement FROM character_achievements WHERE character_id = $1", [characterId])).rows.map((r) => r.achievement),
  );
  return ACHIEVEMENTS.map((a) => ({
    key: a.key, name: a.name, description: a.description, goal: a.goal, rewardGold: a.rewardGold,
    progress: Math.min(a.goal, m[a.metric]),
    state: claimed.has(a.key) ? "claimed" : m[a.metric] >= a.goal ? "claimable" : "locked",
  }));
}

achievementRouter.get("/achievements", async (req: AuthedRequest, res) => {
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  res.json(await list(pool, c.id, c.level, c.gold, c.arena_rating));
});

achievementRouter.post("/achievements/:key/claim", async (req: AuthedRequest, res) => {
  const def = ACHIEVEMENTS.find((a) => a.key === req.params.key);
  if (!def) return res.status(404).json({ error: "Unknown achievement" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true);
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    const m = await metrics(client, c.id, c.level, c.gold, c.arena_rating);
    if (m[def.metric] < def.goal) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "You have not earned this yet" });
    }
    // the primary key is the guard: a second claim inserts nothing
    const ins = await client.query(
      "INSERT INTO character_achievements (character_id, achievement) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [c.id, def.key],
    );
    if (ins.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Reward already claimed" });
    }
    await client.query("UPDATE characters SET gold = gold + $1 WHERE id = $2", [def.rewardGold, c.id]);
    await client.query("COMMIT");
    const fresh = (await loadCharacter(req.userId!))!;
    res.json({ character: characterDto(fresh), achievements: await list(pool, fresh.id, fresh.level, fresh.gold, fresh.arena_rating) });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
