import { randomInt } from "node:crypto";
import { Router } from "express";
import { pool } from "../db/pool.js";
import { mulberry32, simulateBattle } from "../game/battle.js";
import { AP_COST, applyXp, canAttack, canFight, hpAfterBattle } from "../game/rules.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { NUMBER_REVEAL_ATTACKS, STAT_KEYS, STAT_POINTS_PER_LEVEL, goldMultiplier, statView, xpMultiplier } from "../game/stats.js";
import { characterDto, loadCharacter, total, totalMaxHp, totalStats } from "../services/character.js";

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

  const knowledge = new Map<number, number>(
    (await pool.query("SELECT enemy_id, attacks FROM enemy_knowledge WHERE character_id = $1", [c.id])).rows.map((r) => [r.enemy_id, r.attacks]),
  );
  const mine = totalStats(c);

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
          image: `/mobs/${e.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.svg`,
          attacks: knowledge.get(e.id) ?? 0,
          stats: Object.fromEntries(STAT_KEYS.map((k) => [k, statView(k, knowledge.get(e.id) ?? 0, e[k], mine[k])])),
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
      await client.query(`SELECT e.*, a.min_level FROM enemies e JOIN areas a ON a.id = e.area_id WHERE e.id = $1`, [enemyId])
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
    if (!canFight(c.hp, totalMaxHp(c))) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "You are too wounded to fight. Rest until your health recovers." });
    }

    const result = simulateBattle(
      { name: "You", ...totalStats(c) },
      {
        name: e.name, strength: e.strength, dexterity: e.dexterity,
        constitution: e.constitution, charisma: e.charisma, intelligence: e.intelligence,
      },
      mulberry32(randomInt(2 ** 31)),
    );

    let { level, xp, gold } = c;
    let levelsGained = 0;
    const dropped: { name: string; slot: string }[] = [];
    const hp = hpAfterBattle(c.hp, result.enemyDamage);
    // every attack, won or lost, teaches you more about this enemy
    const attacks = (
      await client.query(
        `INSERT INTO enemy_knowledge (character_id, enemy_id, attacks) VALUES ($1,$2,1)
         ON CONFLICT (character_id, enemy_id) DO UPDATE SET attacks = enemy_knowledge.attacks + 1 RETURNING attacks`,
        [c.id, e.id],
      )
    ).rows[0].attacks as number;
    if (attacks === 1) result.log.push(`You size up ${e.name}. Fight more to learn about them.`);
    for (const k of STAT_KEYS) {
      if (NUMBER_REVEAL_ATTACKS[k] === attacks) result.log.push(`You have studied ${e.name} enough to know their exact ${k}.`);
    }
    result.log.push(`You lose ${c.hp - hp} health.`);

    if (result.won) {
      // intelligence boosts XP, charisma boosts gold
      const xpGain = Math.round(e.xp_reward * xpMultiplier(total(c, "intelligence")));
      const goldGain = Math.round(e.gold_reward * goldMultiplier(total(c, "charisma")));
      ({ level, xp, levelsGained } = applyXp(c.level, c.xp, xpGain));
      gold += goldGain;
      await client.query("INSERT INTO progress (character_id, enemy_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [c.id, e.id]);
      result.log.push(`You gain ${xpGain} XP and ${goldGain} gold.`);
      if (levelsGained) {
        result.log.push(`LEVEL UP! You are now level ${level} and gained ${levelsGained * STAT_POINTS_PER_LEVEL} stat points.`);
      }

      // advance matching active quests
      const quests = await client.query(
        `UPDATE character_quests cq
            SET progress = LEAST(q.target_count, cq.progress + 1),
                status = CASE WHEN cq.progress + 1 >= q.target_count THEN 'completed' ELSE 'active' END
           FROM quests q
          WHERE cq.quest_id = q.id AND cq.character_id = $1 AND cq.status = 'active'
            AND (q.type = 'defeat_any' OR (q.type = 'defeat_boss' AND $2::boolean)
                 OR (q.type = 'defeat_enemy' AND q.target_enemy_id = $3))
        RETURNING q.name, cq.status`,
        [c.id, e.is_boss, e.id],
      );
      for (const q of quests.rows) if (q.status === "completed") result.log.push(`Quest complete: ${q.name}! Claim your reward in the Quests tab.`);

      const drops = (
        await client.query(
          `SELECT d.item_id, d.chance, i.name, i.slot FROM enemy_drops d JOIN items i ON i.id = d.item_id WHERE d.enemy_id = $1`,
          [e.id],
        )
      ).rows;
      // every drop in the loot table is rolled on its own, so a win can yield several items or none
      for (const d of drops) {
        if (Math.random() < d.chance) {
          await client.query("INSERT INTO packages (character_id, item_id, source) VALUES ($1,$2,$3)", [c.id, d.item_id, e.name]);
          dropped.push({ name: d.name, slot: d.slot });
          result.log.push(`${e.name} dropped: ${d.name}! It was sent to your Packages.`);
        }
      }
    }
    // Store the regenerated AP/HP with their timestamps so regeneration is neither lost nor double counted.
    // HP regeneration restarts from "now" only when damage was actually taken.
    await client.query(
      `UPDATE characters SET level=$1, xp=$2, gold=$3, ap=$4, ap_updated_at=$5, hp=$6, hp_updated_at=$7,
              stat_points = stat_points + $8 WHERE id=$9`,
      [level, xp, gold, c.ap - AP_COST, c.ap_updated_at, hp, hp === c.hp ? c.hp_updated_at : new Date(),
       levelsGained * STAT_POINTS_PER_LEVEL, c.id],
    );
    await client.query(
      `INSERT INTO battle_logs (character_id, enemy_id, won, log, kind, opponent, player_damage, enemy_damage, rounds)
       VALUES ($1,$2,$3,$4,'expedition',$5,$6,$7,$8)`,
      [c.id, e.id, result.won, JSON.stringify(result.log), e.name, result.playerDamage, result.enemyDamage, JSON.stringify(result.rounds)],
    );
    await client.query("COMMIT");

    const updated = await loadCharacter(req.userId!);
    res.json({
      won: result.won,
      draw: result.draw,
      playerDamage: result.playerDamage,
      enemyDamage: result.enemyDamage,
      rounds: result.rounds,
      enemyName: e.name,
      log: result.log,
      levelsGained,
      drops: dropped,
      character: characterDto(updated!),
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
