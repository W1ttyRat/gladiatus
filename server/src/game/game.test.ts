import { describe, expect, it } from "vitest";
import { BATTLE_ROUNDS, mulberry32, simulateBattle } from "./battle.js";
import { applyXp, canAttack, canFight, hpAfterBattle, regenAp, regenHp } from "./rules.js";

const hero = { name: "Hero", strength: 12, dexterity: 10 };
const foe = { name: "Foe", strength: 6, dexterity: 8 };

describe("simulateBattle", () => {
  it("is deterministic for a given seed", () => {
    expect(simulateBattle(hero, foe, mulberry32(1))).toEqual(simulateBattle(hero, foe, mulberry32(1)));
  });
  it("lets a much stronger fighter win", () => {
    expect(simulateBattle(hero, foe, mulberry32(7)).won).toBe(true);
  });
});

describe("battle rules", () => {
  it("lasts exactly 10 rounds", () => {
    const r = simulateBattle(hero, foe, mulberry32(3));
    expect(r.log.filter((l) => l.startsWith("-- Round")).length).toBe(BATTLE_ROUNDS);
  });
  it("is won by whoever dealt the most damage", () => {
    const r = simulateBattle(hero, foe, mulberry32(11));
    expect(r.won).toBe(r.playerDamage > r.enemyDamage);
    expect(r.draw).toBe(r.playerDamage === r.enemyDamage);
  });
  it("can be lost by the weaker fighter", () => {
    expect(simulateBattle(foe, hero, mulberry32(7)).won).toBe(false);
  });
});

describe("canAttack", () => {
  const base = { characterLevel: 1, areaMinLevel: 1, enemyOrder: 1, defeatedOrdersInArea: [] as number[] };
  it("allows the first enemy", () => expect(canAttack(base)).toBe(true));
  it("locks enemy 2 until enemy 1 is beaten", () => {
    expect(canAttack({ ...base, enemyOrder: 2 })).toBe(false);
    expect(canAttack({ ...base, enemyOrder: 2, defeatedOrdersInArea: [1] })).toBe(true);
  });
  it("locks the boss until enemy 3 is beaten", () => {
    expect(canAttack({ ...base, enemyOrder: 4, defeatedOrdersInArea: [1, 2] })).toBe(false);
    expect(canAttack({ ...base, enemyOrder: 4, defeatedOrdersInArea: [3] })).toBe(true);
  });
  it("locks areas above the character level", () => {
    expect(canAttack({ ...base, areaMinLevel: 5 })).toBe(false);
  });
});

describe("rules", () => {
  it("regens AP over time", () => {
    const t = new Date("2026-01-01T00:00:00Z");
    expect(regenAp(5, t, new Date(t.getTime() + 10 * 60_000)).ap).toBe(7);
  });
  it("levels up with leftover xp", () => {
    expect(applyXp(1, 90, 30)).toEqual({ level: 2, xp: 20, levelsGained: 1 });
  });

  it("regens HP 2% of max per minute and caps at max", () => {
    const t = new Date("2026-01-01T00:00:00Z");
    expect(regenHp(50, 100, t, new Date(t.getTime() + 5 * 60_000)).hp).toBe(60);
    expect(regenHp(50, 100, t, new Date(t.getTime() + 600 * 60_000)).hp).toBe(100);
  });
  it("needs 10% HP to fight and never drops below 1 HP", () => {
    expect(canFight(9, 100)).toBe(false);
    expect(canFight(10, 100)).toBe(true);
    expect(hpAfterBattle(20, 500)).toBe(1);
  });
});
