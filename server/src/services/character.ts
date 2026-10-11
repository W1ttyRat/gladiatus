import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import { MAX_AP, regenAp, xpForNextLevel } from "../game/rules.js";

export interface CharacterRow {
  id: number;
  level: number;
  xp: number;
  gold: number;
  max_hp: number;
  strength: number;
  dexterity: number;
  ap: number;
  ap_updated_at: Date;
}

type Db = Pick<PoolClient, "query">;

/** Loads the character (optionally locking the row) with AP regenerated up to now. */
export async function loadCharacter(userId: number, db: Db = pool, lock = false): Promise<CharacterRow | null> {
  const { rows } = await db.query<CharacterRow>(
    `SELECT id, level, xp, gold, max_hp, strength, dexterity, ap, ap_updated_at FROM characters WHERE user_id = $1${lock ? " FOR UPDATE" : ""}`,
    [userId],
  );
  const c = rows[0];
  if (!c) return null;
  const r = regenAp(c.ap, c.ap_updated_at);
  return { ...c, ap: r.ap, ap_updated_at: r.updatedAt };
}

export function characterDto(c: CharacterRow) {
  return {
    id: c.id,
    level: c.level,
    xp: c.xp,
    xpToNext: xpForNextLevel(c.level),
    gold: c.gold,
    maxHp: c.max_hp,
    strength: c.strength,
    dexterity: c.dexterity,
    ap: c.ap,
    maxAp: MAX_AP,
  };
}
