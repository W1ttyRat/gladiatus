import { blockChance, critChance, damageReduction, doubleAttackChance, hitChance, type Stats } from "./stats.js";

export interface Fighter extends Stats {
  name: string;
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

/** Third-person verb, or the bare form when the subject is "You". */
function v(name: string, verb: string): string {
  return name === "You" ? verb : verb + "s";
}

function strike(att: Fighter, def: Fighter, rng: Rng): { dmg: number; line: string } {
  if (rng() > hitChance(att.dexterity, def.dexterity)) return { dmg: 0, line: `${att.name} ${v(att.name, "swing")} at ${def.name} but misses.` };
  if (rng() < blockChance(def.intelligence)) return { dmg: 0, line: `${def.name} ${v(def.name, "block")} ${att.name === "You" ? "your" : att.name + "'s"} attack!` };
  const crit = rng() < critChance(att.dexterity);
  const base = att.strength * (0.8 + rng() * 0.4) * (1 - damageReduction(def.constitution));
  const dmg = Math.max(1, Math.round(crit ? base * 1.8 : base));
  return {
    dmg,
    line: crit
      ? `${att.name} ${v(att.name, "land")} a CRITICAL blow on ${def.name} for ${dmg} damage!`
      : `${att.name} ${v(att.name, "hit")} ${def.name} for ${dmg} damage.`,
  };
}

/** One attack turn: a normal strike, with a chance of a second one. Returns the total damage. */
function attackTurn(att: Fighter, def: Fighter, rng: Rng, log: string[]): number {
  let total = 0;
  const first = strike(att, def, rng);
  log.push(first.line);
  total += first.dmg;
  if (rng() < doubleAttackChance(att.strength, att.charisma)) {
    const second = strike(att, def, rng);
    log.push(`${att.name} ${v(att.name, "attack")} again! ${second.line}`);
    total += second.dmg;
  }
  return total;
}

/** Exactly BATTLE_ROUNDS rounds; whoever dealt the most total damage wins (equal = draw, no reward). */
export function simulateBattle(player: Fighter, enemy: Fighter, rng: Rng): BattleResult {
  let playerDamage = 0;
  let enemyDamage = 0;
  const log = [`${player.name} ${v(player.name, "face")} ${enemy.name}! Ten rounds, most damage wins.`];
  const playerFirst = player.dexterity >= enemy.dexterity;

  for (let round = 1; round <= BATTLE_ROUNDS; round++) {
    log.push(`-- Round ${round} --`);
    const order: Array<[Fighter, Fighter]> = playerFirst
      ? [[player, enemy], [enemy, player]]
      : [[enemy, player], [player, enemy]];
    for (const [att, def] of order) {
      const dmg = attackTurn(att, def, rng, log);
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
