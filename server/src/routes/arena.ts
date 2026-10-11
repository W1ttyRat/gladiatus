import { randomInt } from "node:crypto";
import { Router } from "express";
import { pool } from "../db/pool.js";
import { mulberry32, simulateBattle } from "../game/battle.js";
import { AP_COST, canFight, hpAfterBattle } from "../game/rules.js";
import { eloDelta } from "../game/stats.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { characterDto, loadCharacter, loadCharacterById, totalMaxHp, totalStats } from "../services/character.js";

export const arenaRouter = Router();
arenaRouter.use(requireAuth);

/** Other gladiators with a level close to yours, nearest rating first. */
arenaRouter.get("/arena", async (req: AuthedRequest, res) => {
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  const { rows } = await pool.query(
    `SELECT c.id, u.username, c.level, c.arena_rating AS rating
       FROM characters c JOIN users u ON u.id = c.user_id
      WHERE c.id <> $1 AND ABS(c.level - $2) <= 5
      ORDER BY ABS(c.arena_rating - $3), c.id LIMIT 10`,
    [c.id, c.level, c.arena_rating],
  );
  res.json({ rating: c.arena_rating, opponents: rows });
});

arenaRouter.post("/arena/:characterId", async (req: AuthedRequest, res) => {
  const opponentId = Number(req.params.characterId);
  if (!Number.isInteger(opponentId)) return res.status(400).json({ error: "Bad opponent id" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true);
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    if (opponentId === c.id) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "You cannot fight yourself" });
    }
    const opp = await loadCharacterById(opponentId, client);
    const oppName = opp && (await client.query("SELECT u.username FROM characters c JOIN users u ON u.id = c.user_id WHERE c.id = $1", [opp.id])).rows[0]?.username;
    if (!opp || !oppName) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Opponent not found" });
    }
    if (Math.abs(opp.level - c.level) > 5) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "That gladiator is too far from your level" });
    }
    if (c.ap < AP_COST) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Not enough attack points" });
    }
    if (!canFight(c.hp, totalMaxHp(c))) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "You are too wounded to fight. Rest until your health recovers." });
    }

    const result = simulateBattle(
      { name: "You", ...totalStats(c) },
      { name: oppName, ...totalStats(opp) },
      mulberry32(randomInt(2 ** 31)),
    );
    const hp = hpAfterBattle(c.hp, result.enemyDamage);
    const score = result.won ? 1 : result.draw ? 0.5 : 0;
    const delta = eloDelta(c.arena_rating, opp.arena_rating, score);
    const goldGain = result.won ? 10 + 5 * opp.level : 0;
    result.log.push(`You lose ${c.hp - hp} health.`);
    result.log.push(`Arena rating ${delta >= 0 ? "+" : ""}${delta}${goldGain ? `, and you win ${goldGain} gold` : ""}.`);

    await client.query(
      `UPDATE characters SET ap=$1, ap_updated_at=$2, hp=$3, hp_updated_at=$4, gold=gold+$5, arena_rating=GREATEST(0, arena_rating+$6) WHERE id=$7`,
      [c.ap - AP_COST, c.ap_updated_at, hp, hp === c.hp ? c.hp_updated_at : new Date(), goldGain, delta, c.id],
    );
    // the defender is not hurt, but their rating moves the other way
    await client.query("UPDATE characters SET arena_rating = GREATEST(0, arena_rating - $1) WHERE id = $2", [delta, opp.id]);
    await client.query("COMMIT");

    res.json({
      won: result.won, draw: result.draw, playerDamage: result.playerDamage, enemyDamage: result.enemyDamage,
      log: result.log, levelsGained: 0, drop: null, ratingChange: delta, goldGain,
      character: characterDto((await loadCharacter(req.userId!))!),
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
