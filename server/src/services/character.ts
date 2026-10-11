import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import { MAX_AP, regenAp, regenHp, xpForNextLevel } from "../game/rules.js";
import {
  STAT_KEYS, blockChance, critChance, damageReduction, doubleAttackChance, goldMultiplier, maxHpFor,
  regenPctPerMinute, shopDiscount, xpMultiplier, type StatKey, type Stats,
} from "../game/stats.js";

export interface CharacterRow extends Stats {
  id: number;
  level: number;
  xp: number;
  gold: number;
  stat_points: number;
  arena_rating: number;
  ap: number;
  ap_updated_at: Date;
  hp: number;
  hp_updated_at: Date;
  bonus: Stats; // sum of equipped item bonuses
  bonus_hp: number;
}

type Db = Pick<PoolClient, "query">;

/** Loads the character (optionally locking its row) with AP and HP regenerated up to now. */
export async function loadCharacter(userId: number, db: Db = pool, lock = false): Promise<CharacterRow | null> {
  return loadCharacterBy("user_id", userId, db, lock);
}

/** Same as loadCharacter, but look the character up by its own id (used for arena opponents). */
export const loadCharacterById = (characterId: number, db: Db = pool, lock = false) =>
  loadCharacterBy("id", characterId, db, lock);

async function loadCharacterBy(column: "user_id" | "id", value: number, db: Db, lock: boolean): Promise<CharacterRow | null> {
  const { rows } = await db.query(
    `SELECT c.*, b.*
       FROM characters c
       CROSS JOIN LATERAL (
         SELECT COALESCE(SUM(i.strength),0)::int AS b_strength,
                COALESCE(SUM(i.dexterity),0)::int AS b_dexterity,
                COALESCE(SUM(i.constitution),0)::int AS b_constitution,
                COALESCE(SUM(i.charisma),0)::int AS b_charisma,
                COALESCE(SUM(i.intelligence),0)::int AS b_intelligence,
                COALESCE(SUM(i.hp),0)::int AS bonus_hp
           FROM character_items ci JOIN items i ON i.id = ci.item_id
          WHERE ci.character_id = c.id AND ci.equipped
       ) b
      WHERE c.${column} = $1${lock ? " FOR UPDATE OF c" : ""}`,
    [value],
  );
  const r = rows[0];
  if (!r) return null;
  const bonus = Object.fromEntries(STAT_KEYS.map((k) => [k, r[`b_${k}`]])) as Stats;
  const c: CharacterRow = {
    id: r.id, level: r.level, xp: r.xp, gold: r.gold, stat_points: r.stat_points, arena_rating: r.arena_rating,
    strength: r.strength, dexterity: r.dexterity, constitution: r.constitution,
    charisma: r.charisma, intelligence: r.intelligence,
    ap: r.ap, ap_updated_at: r.ap_updated_at, hp: r.hp, hp_updated_at: r.hp_updated_at,
    bonus, bonus_hp: r.bonus_hp,
  };
  const ap = regenAp(c.ap, c.ap_updated_at);
  const hp = regenHp(c.hp, totalMaxHp(c), c.hp_updated_at, new Date(), regenPctPerMinute(total(c, "constitution")));
  return { ...c, ap: ap.ap, ap_updated_at: ap.updatedAt, hp: hp.hp, hp_updated_at: hp.updatedAt };
}

/** Base stat plus equipment bonus. */
export const total = (c: CharacterRow, k: StatKey) => c[k] + c.bonus[k];
export const totalStats = (c: CharacterRow): Stats =>
  Object.fromEntries(STAT_KEYS.map((k) => [k, total(c, k)])) as Stats;
export const totalMaxHp = (c: CharacterRow) => maxHpFor(total(c, "constitution"), c.bonus_hp);

export function characterDto(c: CharacterRow) {
  const t = totalStats(c);
  const maxHp = totalMaxHp(c);
  return {
    id: c.id,
    level: c.level,
    xp: c.xp,
    xpToNext: xpForNextLevel(c.level),
    gold: c.gold,
    hp: c.hp,
    maxHp,
    statPoints: c.stat_points,
    arenaRating: c.arena_rating,
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, { base: c[k], bonus: c.bonus[k], total: t[k] }])),
    derived: {
      doubleAttackChance: doubleAttackChance(t.strength, t.charisma),
      critChance: critChance(t.dexterity),
      blockChance: blockChance(t.intelligence),
      damageReduction: damageReduction(t.constitution),
      regenPerMinute: Math.max(1, Math.floor(maxHp * regenPctPerMinute(t.constitution))),
      goldBonus: goldMultiplier(t.charisma) - 1,
      xpBonus: xpMultiplier(t.intelligence) - 1,
      shopDiscount: shopDiscount(t.charisma),
    },
    ap: c.ap,
    maxAp: MAX_AP,
  };
}
