export const STAT_KEYS = ["strength", "dexterity", "constitution", "charisma", "intelligence"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export const STAT_POINTS_PER_LEVEL = 5;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// What each stat does (all formulas live here so balance changes touch one file):
//  strength     -> damage per hit, and chance of a double attack
//  dexterity    -> hit chance (vs. the defender's dexterity) and critical chance
//  constitution -> max HP, damage reduction and faster HP regeneration
//  charisma     -> chance of a double attack, bonus gold from fights, shop discount
//  intelligence -> chance to block a hit completely, bonus XP
export const hitChance = (attDex: number, defDex: number) => clamp(0.75 + (attDex - defDex) * 0.01, 0.5, 0.95);
export const critChance = (dex: number) => clamp(0.05 + dex * 0.003, 0, 0.4);
export const doubleAttackChance = (str: number, cha: number) => clamp(str * 0.004 + cha * 0.004, 0, 0.4);
export const blockChance = (int: number) => clamp(int * 0.004, 0, 0.3);
export const damageReduction = (con: number) => clamp(con * 0.004, 0, 0.5);
export const maxHpFor = (con: number, itemHp: number) => 100 + con * 10 + itemHp;
export const regenPctPerMinute = (con: number) => 0.015 + con * 0.0005;
export const goldMultiplier = (cha: number) => 1 + cha * 0.005;
export const xpMultiplier = (int: number) => 1 + int * 0.005;
export const shopDiscount = (cha: number) => clamp(cha * 0.003, 0, 0.3);

/** Gold price of training one base stat point; grows with the square of the current value. */
export const trainingCost = (base: number) => Math.round(base * base * 0.5);

/** How many items of a slot can be worn at once (two rings, everything else one). */
export const slotCapacity = (slot: string) => (slot === "ring" ? 2 : 1);

/** Elo rating change for the player: score is 1 (win), 0.5 (draw) or 0 (loss). */
export function eloDelta(own: number, opponent: number, score: number, k = 32) {
  const expected = 1 / (1 + 10 ** ((opponent - own) / 400));
  return Math.round(k * (score - expected));
}

// ---- how much of an enemy's stats the player knows ----
// 0 attacks: everything is hidden. From the 1st attack the stat is shown as a word relative to your own
// stat. After enough attacks the exact number is revealed, one stat at a time.
export const NUMBER_REVEAL_ATTACKS: Record<StatKey, number> = {
  strength: 4, dexterity: 6, constitution: 8, charisma: 10, intelligence: 12,
};

export type StatView =
  | { kind: "hidden" }
  | { kind: "rating"; label: string; tone: "easy" | "even" | "hard" }
  | { kind: "number"; value: number };

/** Compares an enemy stat to the player's matching stat. */
export function describeRatio(enemyValue: number, playerValue: number): { label: string; tone: "easy" | "even" | "hard" } {
  const r = enemyValue / Math.max(1, playerValue);
  if (r < 0.5) return { label: "Very weak", tone: "easy" };
  if (r < 0.8) return { label: "Weak", tone: "easy" };
  if (r <= 1.2) return { label: "Comparable", tone: "even" };
  if (r <= 1.6) return { label: "Strong", tone: "hard" };
  if (r <= 2.2) return { label: "Very strong", tone: "hard" };
  return { label: "Overwhelming", tone: "hard" };
}

export function statView(stat: StatKey, attacks: number, enemyValue: number, playerValue: number): StatView {
  if (attacks <= 0) return { kind: "hidden" };
  if (attacks >= NUMBER_REVEAL_ATTACKS[stat]) return { kind: "number", value: enemyValue };
  return { kind: "rating", ...describeRatio(enemyValue, playerValue) };
}
