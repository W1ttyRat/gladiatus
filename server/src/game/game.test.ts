import { describe, expect, it } from "vitest";
import { BATTLE_ROUNDS, mulberry32, simulateBattle } from "./battle.js";
import { applyXp, canAttack, canFight, hpAfterBattle, regenAp, regenHp } from "./rules.js";
import { eloDelta, slotCapacity, trainingCost, blockChance, damageReduction, doubleAttackChance, goldMultiplier, maxHpFor, regenPctPerMinute, shopDiscount } from "./stats.js";

const hero = { name: "Hero", strength: 12, dexterity: 10, constitution: 10, charisma: 10, intelligence: 10 };
const foe = { name: "Foe", strength: 6, dexterity: 8, constitution: 5, charisma: 5, intelligence: 5 };

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

describe("stat formulas", () => {
  it("each stat has its effect and caps", () => {
    expect(maxHpFor(10, 0)).toBe(200);
    expect(maxHpFor(20, 30)).toBe(330);
    expect(doubleAttackChance(1000, 1000)).toBe(0.4);
    expect(blockChance(0)).toBe(0);
    expect(damageReduction(1000)).toBe(0.5);
    expect(shopDiscount(10)).toBeCloseTo(0.03);
    expect(goldMultiplier(10)).toBeCloseTo(1.05);
  });
  it("more strength means more total damage", () => {
    const sum = (str: number) => {
      let t = 0;
      for (let s = 1; s <= 200; s++) t += simulateBattle({ ...hero, strength: str }, foe, mulberry32(s)).playerDamage;
      return t;
    };
    expect(sum(30)).toBeGreaterThan(sum(10));
  });
  it("regen percentage scales with constitution", () => {
    const t = new Date("2026-01-01T00:00:00Z");
    const later = new Date(t.getTime() + 60_000);
    expect(regenHp(0, 1000, t, later, regenPctPerMinute(40)).hp).toBeGreaterThan(regenHp(0, 1000, t, later, regenPctPerMinute(10)).hp);
  });
});

describe("arena, training and slots", () => {
  it("elo: beating a stronger player pays more than beating a weaker one", () => {
    expect(eloDelta(1000, 1200, 1)).toBeGreaterThan(eloDelta(1000, 800, 1));
    expect(eloDelta(1000, 1000, 1)).toBe(16);
    expect(eloDelta(1000, 1000, 0.5)).toBe(0);
    expect(eloDelta(1000, 1000, 0)).toBe(-16);
  });
  it("training gets more expensive with the stat", () => {
    expect(trainingCost(10)).toBe(50);
    expect(trainingCost(20)).toBe(200);
  });
  it("rings have two slots, everything else one", () => {
    expect(slotCapacity("ring")).toBe(2);
    expect(slotCapacity("weapon")).toBe(1);
    expect(slotCapacity("amulet")).toBe(1);
  });
});
