export interface Fighter {
  name: string;
  maxHp: number;
  strength: number;
  dexterity: number;
}

export interface BattleResult {
  won: boolean;
  log: string[];
}

export type Rng = () => number;

/** Small deterministic RNG so battles can be replayed and tested. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_ROUNDS = 50;

function attack(att: Fighter, def: Fighter, rng: Rng): { dmg: number; line: string } {
  const hitChance = Math.min(0.95, Math.max(0.5, 0.75 + (att.dexterity - def.dexterity) * 0.01));
  if (rng() > hitChance) return { dmg: 0, line: `${att.name} swings at ${def.name} but misses.` };
  const crit = rng() < 0.1;
  const base = att.strength * (0.8 + rng() * 0.4);
  const dmg = Math.max(1, Math.round(crit ? base * 1.8 : base));
  return {
    dmg,
    line: crit
      ? `${att.name} lands a CRITICAL blow on ${def.name} for ${dmg} damage!`
      : `${att.name} hits ${def.name} for ${dmg} damage.`,
  };
}

export function simulateBattle(player: Fighter, enemy: Fighter, rng: Rng): BattleResult {
  let pHp = player.maxHp;
  let eHp = enemy.maxHp;
  const log = [`${player.name} (${pHp} HP) faces ${enemy.name} (${eHp} HP)!`];
  const playerFirst = player.dexterity >= enemy.dexterity;

  for (let round = 1; round <= MAX_ROUNDS && pHp > 0 && eHp > 0; round++) {
    log.push(`-- Round ${round} --`);
    const order: Array<[Fighter, Fighter]> = playerFirst
      ? [[player, enemy], [enemy, player]]
      : [[enemy, player], [player, enemy]];
    for (const [att, def] of order) {
      if (pHp <= 0 || eHp <= 0) break;
      const { dmg, line } = attack(att, def, rng);
      log.push(line);
      if (att === player) eHp -= dmg;
      else pHp -= dmg;
    }
  }

  const won = eHp <= 0 && pHp > 0;
  log.push(
    won ? `${enemy.name} falls. Victory!` : pHp <= 0 ? `${player.name} is defeated...` : "The fight drags on and both retreat. Defeat.",
  );
  return { won, log };
}
