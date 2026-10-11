import { randomInt } from "node:crypto";
import { Router } from "express";
import { pool } from "../db/pool.js";
import { mulberry32, simulateBattle } from "../game/battle.js";
import { AP_COST, applyXp, canAttack } from "../game/rules.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { characterDto, loadCharacter } from "../services/character.js";

export const gameRouter = Router();
gameRouter.use(requireAuth);

gameRouter.get("/areas", async (req: AuthedRequest, res) => {
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  const areas = (await pool.query("SELECT id, name, min_level, sort_order FROM areas ORDER BY sort_order")).rows;
  const enemies = (await pool.query("SELECT * FROM enemies ORDER BY area_id, sort_order")).rows;
  const defeated = new Set(
    (await pool.query("SELECT enemy_id FROM progress WHERE character_id = $1", [c.id])).rows.map((r) => r.enemy_id),
  );

  res.json(
    areas.map((a) => {
      const inArea = enemies.filter((e) => e.area_id === a.id);
      const defeatedOrders = inArea.filter((e) => defeated.has(e.id)).map((e) => e.sort_order);
      return {
        id: a.id,
        name: a.name,
        minLevel: a.min_level,
        unlocked: c.level >= a.min_level,
        enemies: inArea.map((e) => ({
          id: e.id,
          name: e.name,
          level: e.level,
          isBoss: e.is_boss,
          maxHp: e.max_hp,
          defeated: defeated.has(e.id),
          unlocked: canAttack({
            characterLevel: c.level,
            areaMinLevel: a.min_level,
            enemyOrder: e.sort_order,
            defeatedOrdersInArea: defeatedOrders,
          }),
        })),
      };
    }),
  );
});

gameRouter.post("/battle/:enemyId", async (req: AuthedRequest, res) => {
  const enemyId = Number(req.params.enemyId);
  if (!Number.isInteger(enemyId)) return res.status(400).json({ error: "Bad enemy id" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true); // row lock prevents double-spend of AP
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    const e = (
      await client.query(
        `SELECT e.*, a.min_level FROM enemies e JOIN areas a ON a.id = e.area_id WHERE e.id = $1`,
        [enemyId],
      )
    ).rows[0];
    if (!e) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Enemy not found" });
    }
    const defeatedOrders = (
      await client.query(
        `SELECT e.sort_order FROM progress p JOIN enemies e ON e.id = p.enemy_id
         WHERE p.character_id = $1 AND e.area_id = $2`,
        [c.id, e.area_id],
      )
    ).rows.map((r) => r.sort_order as number);

    if (!canAttack({ characterLevel: c.level, areaMinLevel: e.min_level, enemyOrder: e.sort_order, defeatedOrdersInArea: defeatedOrders })) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "This enemy is still locked" });
    }
    if (c.ap < AP_COST) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Not enough attack points" });
    }

    const result = simulateBattle(
      { name: "You", maxHp: c.max_hp, strength: c.strength, dexterity: c.dexterity },
      { name: e.name, maxHp: e.max_hp, strength: e.strength, dexterity: e.dexterity },
      mulberry32(randomInt(2 ** 31)),
    );

    let { level, xp, gold } = c;
    let levelsGained = 0;
    if (result.won) {
      ({ level, xp, levelsGained } = applyXp(c.level, c.xp, e.xp_reward));
      gold += e.gold_reward;
      await client.query("INSERT INTO progress (character_id, enemy_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [c.id, e.id]);
      result.log.push(`You gain ${e.xp_reward} XP and ${e.gold_reward} gold.`);
      if (levelsGained) result.log.push(`LEVEL UP! You are now level ${level}.`);
    }
    // Pass the regenerated AP/timestamp so regen is not lost or double counted.
    await client.query(
      `UPDATE characters SET level=$1, xp=$2, gold=$3, ap=$4, ap_updated_at=$5 WHERE id=$6`,
      [level, xp, gold, c.ap - AP_COST, c.ap_updated_at, c.id],
    );
    await client.query("INSERT INTO battle_logs (character_id, enemy_id, won, log) VALUES ($1,$2,$3,$4)", [
      c.id, e.id, result.won, JSON.stringify(result.log),
    ]);
    await client.query("COMMIT");

    const updated = await loadCharacter(req.userId!);
    res.json({ won: result.won, log: result.log, levelsGained, character: characterDto(updated!) });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
