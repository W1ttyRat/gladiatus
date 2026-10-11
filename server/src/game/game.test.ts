import { describe, expect, it } from "vitest";
import { mulberry32, simulateBattle } from "./battle.js";
import { applyXp, canAttack, regenAp } from "./rules.js";

const hero = { name: "Hero", maxHp: 100, strength: 12, dexterity: 10 };
const foe = { name: "Foe", maxHp: 60, strength: 6, dexterity: 8 };

describe("simulateBattle", () => {
  it("is deterministic for a given seed", () => {
    expect(simulateBattle(hero, foe, mulberry32(1))).toEqual(simulateBattle(hero, foe, mulberry32(1)));
  });
  it("lets a much stronger fighter win", () => {
    expect(simulateBattle(hero, foe, mulberry32(7)).won).toBe(true);
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
});
