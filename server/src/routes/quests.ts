import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { applyXp } from "../game/rules.js";
import { STAT_POINTS_PER_LEVEL } from "../game/stats.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { characterDto, loadCharacter } from "../services/character.js";

export const questRouter = Router();
questRouter.use(requireAuth);

async function listQuests(characterId: number, level: number) {
  const { rows } = await pool.query(
    `SELECT q.id, q.name, q.description, q.type, q.target_count, q.min_level, q.reward_gold, q.reward_xp,
            i.name AS reward_item, e.name AS target_enemy, cq.status, COALESCE(cq.progress, 0) AS progress
       FROM quests q
       LEFT JOIN items i ON i.id = q.reward_item_id
       LEFT JOIN enemies e ON e.id = q.target_enemy_id
       LEFT JOIN character_quests cq ON cq.quest_id = q.id AND cq.character_id = $1
      ORDER BY q.min_level, q.sort_order, q.id`,
    [characterId],
  );
  return rows.map((q) => ({
    id: q.id, name: q.name, description: q.description, type: q.type, targetEnemy: q.target_enemy,
    targetCount: q.target_count, minLevel: q.min_level, rewardGold: q.reward_gold, rewardXp: q.reward_xp,
    rewardItem: q.reward_item, status: q.status ?? "available", progress: q.progress, locked: level < q.min_level,
  }));
}

questRouter.get("/quests", async (req: AuthedRequest, res) => {
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  res.json(await listQuests(c.id, c.level));
});

questRouter.post("/quests/:id/accept", async (req: AuthedRequest, res) => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "Bad quest id" });
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  const q = (await pool.query("SELECT min_level FROM quests WHERE id = $1", [id.data])).rows[0];
  if (!q) return res.status(404).json({ error: "Quest not found" });
  if (c.level < q.min_level) return res.status(403).json({ error: `Requires level ${q.min_level}` });
  const r = await pool.query(
    "INSERT INTO character_quests (character_id, quest_id, status) VALUES ($1,$2,'active') ON CONFLICT DO NOTHING",
    [c.id, id.data],
  );
  if (r.rowCount === 0) return res.status(409).json({ error: "You already took this quest" });
  res.json({ quests: await listQuests(c.id, c.level) });
});

questRouter.post("/quests/:id/claim", async (req: AuthedRequest, res) => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "Bad quest id" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true);
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    // the status flip is the guard: only one concurrent claim can match 'completed'
    const claimed = await client.query(
      `UPDATE character_quests SET status = 'claimed' WHERE character_id = $1 AND quest_id = $2 AND status = 'completed' RETURNING quest_id`,
      [c.id, id.data],
    );
    if (claimed.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Quest is not ready to be claimed" });
    }
    const q = (await client.query("SELECT * FROM quests WHERE id = $1", [id.data])).rows[0];
    const lvl = applyXp(c.level, c.xp, q.reward_xp);
    await client.query(
      "UPDATE characters SET level=$1, xp=$2, gold=gold+$3, stat_points=stat_points+$4 WHERE id=$5",
      [lvl.level, lvl.xp, q.reward_gold, lvl.levelsGained * STAT_POINTS_PER_LEVEL, c.id],
    );
    if (q.reward_item_id) {
      await client.query("INSERT INTO packages (character_id, item_id, source) VALUES ($1,$2,$3)", [c.id, q.reward_item_id, `Quest: ${q.name}`]);
    }
    await client.query("COMMIT");
    const fresh = (await loadCharacter(req.userId!))!;
    res.json({ character: characterDto(fresh), quests: await listQuests(c.id, fresh.level), levelsGained: lvl.levelsGained });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
