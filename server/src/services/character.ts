import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import { MAX_AP, regenAp, regenHp, xpForNextLevel } from "../game/rules.js";

export interface CharacterRow {
  id: number;
  level: number;
  xp: number;
  gold: number;
  max_hp: number; // base, without equipment
  strength: number; // base
  dexterity: number; // base
  ap: number;
  ap_updated_at: Date;
  hp: number;
  hp_updated_at: Date;
  bonus_str: number;
  bonus_dex: number;
  bonus_hp: number;
}

type Db = Pick<PoolClient, "query">;

/** Loads the character (optionally locking its row) with AP and HP regenerated up to now. */
export async function loadCharacter(userId: number, db: Db = pool, lock = false): Promise<CharacterRow | null> {
  const { rows } = await db.query<CharacterRow>(
    `SELECT c.*, b.bonus_str, b.bonus_dex, b.bonus_hp
       FROM characters c
       CROSS JOIN LATERAL (
         SELECT COALESCE(SUM(i.strength),0)::int AS bonus_str,
                COALESCE(SUM(i.dexterity),0)::int AS bonus_dex,
                COALESCE(SUM(i.hp),0)::int AS bonus_hp
           FROM character_items ci JOIN items i ON i.id = ci.item_id
          WHERE ci.character_id = c.id AND ci.equipped
       ) b
      WHERE c.user_id = $1${lock ? " FOR UPDATE OF c" : ""}`,
    [userId],
  );
  const c = rows[0];
  if (!c) return null;
  const ap = regenAp(c.ap, c.ap_updated_at);
  const hp = regenHp(c.hp, c.max_hp + c.bonus_hp, c.hp_updated_at);
  return { ...c, ap: ap.ap, ap_updated_at: ap.updatedAt, hp: hp.hp, hp_updated_at: hp.updatedAt };
}

export const totalMaxHp = (c: CharacterRow) => c.max_hp + c.bonus_hp;

export function characterDto(c: CharacterRow) {
  return {
    id: c.id,
    level: c.level,
    xp: c.xp,
    xpToNext: xpForNextLevel(c.level),
    gold: c.gold,
    hp: c.hp,
    maxHp: totalMaxHp(c),
    strength: c.strength + c.bonus_str,
    dexterity: c.dexterity + c.bonus_dex,
    bonus: { strength: c.bonus_str, dexterity: c.bonus_dex, hp: c.bonus_hp },
    ap: c.ap,
    maxAp: MAX_AP,
  };
}
