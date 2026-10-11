export interface Fighter {
  name: string;
  strength: number;
  dexterity: number;
}

export interface BattleResult {
  won: boolean;
  draw: boolean;
  playerDamage: number; // total damage the player dealt
  enemyDamage: number; // total damage the enemy dealt (this is what the player loses in HP)
  log: string[];
}

export type Rng = () => number;

export const BATTLE_ROUNDS = 10;

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

/** Exactly BATTLE_ROUNDS rounds; whoever dealt the most total damage wins (equal = draw, no reward). */
export function simulateBattle(player: Fighter, enemy: Fighter, rng: Rng): BattleResult {
  let playerDamage = 0;
  let enemyDamage = 0;
  const log = [`${player.name} faces ${enemy.name}! Ten rounds, most damage wins.`];
  const playerFirst = player.dexterity >= enemy.dexterity;

  for (let round = 1; round <= BATTLE_ROUNDS; round++) {
    log.push(`-- Round ${round} --`);
    const order: Array<[Fighter, Fighter]> = playerFirst
      ? [[player, enemy], [enemy, player]]
      : [[enemy, player], [player, enemy]];
    for (const [att, def] of order) {
      const { dmg, line } = attack(att, def, rng);
      log.push(line);
      if (att === player) playerDamage += dmg;
      else enemyDamage += dmg;
    }
  }

  const won = playerDamage > enemyDamage;
  const draw = playerDamage === enemyDamage;
  log.push(`Total damage: ${player.name} ${playerDamage} - ${enemy.name} ${enemyDamage}.`);
  log.push(won ? `${player.name} wins the bout!` : draw ? "A draw! Nobody gains anything." : `${enemy.name} wins the bout...`);
  return { won, draw, playerDamage, enemyDamage, log };
}
