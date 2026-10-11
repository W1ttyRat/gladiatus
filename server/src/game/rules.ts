export const MAX_AP = 20;
export const AP_REGEN_MINUTES = 5;
export const AP_COST = 1;

export function xpForNextLevel(level: number): number {
  return level * 100;
}

/** Lazy AP regeneration: compute current AP from the stored value and timestamp. */
export function regenAp(ap: number, updatedAt: Date, now = new Date()): { ap: number; updatedAt: Date } {
  if (ap >= MAX_AP) return { ap, updatedAt: now };
  const gained = Math.floor((now.getTime() - updatedAt.getTime()) / (AP_REGEN_MINUTES * 60_000));
  if (gained <= 0) return { ap, updatedAt };
  const newAp = Math.min(MAX_AP, ap + gained);
  return {
    ap: newAp,
    updatedAt: newAp >= MAX_AP ? now : new Date(updatedAt.getTime() + gained * AP_REGEN_MINUTES * 60_000),
  };
}

export interface UnlockInput {
  characterLevel: number;
  areaMinLevel: number;
  enemyOrder: number;
  defeatedOrdersInArea: number[];
}

/** Attackable if the area is level-unlocked and the previous enemy was beaten at least once. */
export function canAttack(i: UnlockInput): boolean {
  if (i.characterLevel < i.areaMinLevel) return false;
  return i.enemyOrder === 1 || i.defeatedOrdersInArea.includes(i.enemyOrder - 1);
}

/** Applies gained xp, handling multiple level-ups. */
export function applyXp(level: number, xp: number, gained: number): { level: number; xp: number; levelsGained: number } {
  let l = level;
  let x = xp + gained;
  while (x >= xpForNextLevel(l)) {
    x -= xpForNextLevel(l);
    l++;
  }
  return { level: l, xp: x, levelsGained: l - level };
}

/** HP regenerates passively: a share of max HP per full minute (at least 1 HP). */
export function regenHp(hp: number, maxHp: number, updatedAt: Date, now = new Date(), pctPerMinute = 0.02): { hp: number; updatedAt: Date } {
  if (hp >= maxHp) return { hp: maxHp, updatedAt: now };
  const minutes = Math.floor((now.getTime() - updatedAt.getTime()) / 60_000);
  if (minutes <= 0) return { hp, updatedAt };
  const newHp = Math.min(maxHp, hp + minutes * Math.max(1, Math.floor(maxHp * pctPerMinute)));
  return { hp: newHp, updatedAt: newHp >= maxHp ? now : new Date(updatedAt.getTime() + minutes * 60_000) };
}

/** You need at least 10% of your max HP to enter a fight. */
export function canFight(hp: number, maxHp: number): boolean {
  return hp >= Math.ceil(maxHp * 0.1);
}

/** Damage taken in a fight is applied after it; HP never drops below 1. */
export function hpAfterBattle(hp: number, damageTaken: number): number {
  return Math.max(1, hp - damageTaken);
}
