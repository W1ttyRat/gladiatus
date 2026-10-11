import { pool } from "./pool.js";

type Slot = "weapon" | "helmet" | "armor" | "boots" | "ring" | "amulet";
interface ItemDef {
  name: string;
  slot: Slot;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  charisma?: number;
  intelligence?: number;
  hp?: number;
  price: number;
  minLevel?: number;
  shop?: boolean;
}

const TIER_LEVELS = [1, 5, 10, 15];
const TIER_PRICE = [60, 220, 650, 1600];
const priceOf = (tier: number, factor: number) => Math.round(TIER_PRICE[tier - 1] * factor);

async function insertItem(i: ItemDef): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO items (name, slot, strength, dexterity, constitution, charisma, intelligence, hp, price, min_level, sold_in_shop)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [i.name, i.slot, i.strength ?? 0, i.dexterity ?? 0, i.constitution ?? 0, i.charisma ?? 0, i.intelligence ?? 0,
     i.hp ?? 0, i.price, i.minLevel ?? 1, i.shop ?? false],
  );
  return rows[0].id;
}

// ---- shop stock: 4 tiers per line, stats scale with the tier t ----
const shopLines: Array<{ names: string[]; slot: Slot; factor: number; stats: (t: number) => Partial<ItemDef> }> = [
  { names: ["Wooden Club", "Iron Sword", "Steel Axe", "Knight's Blade"], slot: "weapon", factor: 1.2, stats: (t) => ({ strength: 4 * t, dexterity: t }) },
  { names: ["Hunting Knife", "Rapier", "Twin Daggers", "Shadow Blade"], slot: "weapon", factor: 1.2, stats: (t) => ({ strength: 2 * t, dexterity: 3 * t }) },
  { names: ["Cloth Hood", "Leather Helm", "Iron Helm", "Steel Visor"], slot: "helmet", factor: 0.7, stats: (t) => ({ constitution: 2 * t, intelligence: t }) },
  { names: ["Tunic", "Leather Armor", "Chainmail", "Plate Armor"], slot: "armor", factor: 1, stats: (t) => ({ constitution: 3 * t, hp: 10 * t }) },
  { names: ["Sandals", "Leather Boots", "Iron Boots", "Steel Greaves"], slot: "boots", factor: 0.7, stats: (t) => ({ dexterity: 2 * t, constitution: t }) },
  { names: ["Copper Ring", "Ring of Might", "Gladiator's Signet", "Champion's Band"], slot: "ring", factor: 1, stats: (t) => ({ strength: 2 * t, dexterity: t }) },
  { names: ["Silver Ring", "Ring of Charm", "Merchant's Seal", "Emperor's Ring"], slot: "ring", factor: 1, stats: (t) => ({ charisma: 2 * t, intelligence: t }) },
  { names: ["Bone Charm", "Amulet of Vigor", "Dragon Fang Amulet", "Heart of the Colosseum"], slot: "amulet", factor: 1.1, stats: (t) => ({ constitution: 2 * t, hp: 12 * t }) },
  { names: ["Lucky Coin", "Scholar's Amulet", "Sage's Medallion", "Oracle's Eye"], slot: "amulet", factor: 1.1, stats: (t) => ({ intelligence: 2 * t, charisma: t }) },
];

const foods = [
  { name: "Bread", healPct: 15, price: 8, minLevel: 1 },
  { name: "Cheese and Apples", healPct: 30, price: 25, minLevel: 1 },
  { name: "Hearty Stew", healPct: 50, price: 70, minLevel: 5 },
  { name: "Roast Boar", healPct: 75, price: 160, minLevel: 8 },
  { name: "Gladiator's Feast", healPct: 100, price: 300, minLevel: 12 },
];

// ---- areas: enemy 1-3 are normal, enemy 4 is the boss; each drops a piece of gear, enemies 2 and 3 may also drop jewelry ----
const areas = [
  {
    name: "Dusty Outskirts", minLevel: 1,
    enemies: ["Stray Dog", "Bandit Scout", "Rogue Slave", "Bandit Chief"],
    items: ["Leather Cap", "Padded Vest", "Worn Boots", "Chief's Cleaver"],
    jewelry: ["Lucky Pebble", "Bandit's Band"], // amulet from enemy 2, ring from enemy 3
  },
  {
    name: "Whispering Forest", minLevel: 5,
    enemies: ["Wolf Pack Leader", "Poacher", "Forest Witch", "Ancient Treant"],
    items: ["Hunter's Hood", "Wolfhide Jerkin", "Silent Boots", "Treant Branch"],
    jewelry: ["Druid's Charm", "Wolf Tooth Ring"],
  },
  {
    name: "Iron Mountains", minLevel: 10,
    enemies: ["Cave Bear", "Dwarf Raider", "Stone Golem", "Mountain King"],
    items: ["Dwarven Helm", "Dwarven Plate", "Mountain Greaves", "King's Warhammer"],
    jewelry: ["Mountain Heart", "Dwarven Signet"],
  },
];
const dropSlots = ["helmet", "armor", "boots", "weapon"] as const;
const dropStats = (slot: (typeof dropSlots)[number], t: number): Partial<ItemDef> =>
  ({
    helmet: { constitution: t, dexterity: t, hp: 8 * t },
    armor: { constitution: 2 * t, hp: 15 * t },
    boots: { dexterity: 2 * t, hp: 4 * t },
    weapon: { strength: 3 * t, dexterity: t },
  })[slot];

const jewelryStats = (slot: "ring" | "amulet", t: number): Partial<ItemDef> =>
  slot === "ring" ? { strength: 2 * t, charisma: t } : { constitution: t, intelligence: t, hp: 10 * t };

await pool.query("TRUNCATE areas, items, foods RESTART IDENTITY CASCADE");

await insertItem({ name: "Rusty Sword", slot: "weapon", strength: 2, price: 5 });

for (const line of shopLines) {
  for (const [idx, name] of line.names.entries()) {
    const tier = idx + 1;
    await insertItem({ name, slot: line.slot, ...line.stats(tier), price: priceOf(tier, line.factor), minLevel: TIER_LEVELS[idx], shop: true });
  }
}
for (const f of foods) {
  await pool.query("INSERT INTO foods (name, heal_pct, price, min_level) VALUES ($1,$2,$3,$4)", [f.name, f.healPct, f.price, f.minLevel]);
}

const enemyIds = new Map<string, number>();
const itemIds = new Map<string, number>();
for (const [ai, a] of areas.entries()) {
  const tier = ai + 1;
  const { rows } = await pool.query("INSERT INTO areas (name, min_level, sort_order) VALUES ($1,$2,$3) RETURNING id", [a.name, a.minLevel, tier]);
  for (const [ei, name] of a.enemies.entries()) {
    const boss = ei === 3;
    const lvl = a.minLevel + ei;
    const m = boss ? 1.6 : 1;
    const enemy = await pool.query(
      `INSERT INTO enemies (area_id, sort_order, is_boss, name, level, max_hp, strength, dexterity, constitution, charisma, intelligence, xp_reward, gold_reward)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [
        rows[0].id, ei + 1, boss, name, lvl, Math.round((60 + lvl * 12) * m),
        Math.round((2.5 + lvl * 1.5) * m), Math.round((5 + lvl) * m), Math.round((5 + lvl) * m),
        Math.round((5 + lvl * 0.5) * m), Math.round((5 + lvl * 0.5) * m),
        Math.round((10 + lvl * 5) * m), Math.round((5 + lvl * 4) * m),
      ],
    );
    enemyIds.set(name, enemy.rows[0].id);
    const slot = dropSlots[ei];
    const itemId = await insertItem({
      name: a.items[ei], slot, ...dropStats(slot, tier), price: Math.round(TIER_PRICE[tier - 1] * (boss ? 0.9 : 0.5)), minLevel: a.minLevel,
    });
    itemIds.set(a.items[ei], itemId);
    await pool.query("INSERT INTO enemy_drops (enemy_id, item_id, chance) VALUES ($1,$2,$3)", [enemy.rows[0].id, itemId, boss ? 0.6 : 0.4]);
    if (ei === 1 || ei === 2) {
      const jslot = ei === 1 ? "amulet" : "ring";
      const jname = a.jewelry[ei - 1];
      const jid = await insertItem({ name: jname, slot: jslot, ...jewelryStats(jslot, tier), price: Math.round(TIER_PRICE[tier - 1] * 0.5), minLevel: a.minLevel });
      await pool.query("INSERT INTO enemy_drops (enemy_id, item_id, chance) VALUES ($1,$2,$3)", [enemy.rows[0].id, jid, 0.15]);
    }
  }
}

// ---- quests ----
interface QuestDef {
  name: string; description: string; type: "defeat_enemy" | "defeat_any" | "defeat_boss";
  enemy?: string; count: number; minLevel: number; gold: number; xp: number; item?: string;
}
const quests: QuestDef[] = [
  { name: "Dog Catcher", description: "The villagers are tired of the stray dogs. Drive off the Stray Dog.", type: "defeat_enemy", enemy: "Stray Dog", count: 3, minLevel: 1, gold: 40, xp: 30 },
  { name: "Clear the Roads", description: "Win any five fights to make the roads safe for merchants.", type: "defeat_any", count: 5, minLevel: 1, gold: 60, xp: 50 },
  { name: "Scouting the Scouts", description: "Bandit Scouts are watching the caravans. Defeat them.", type: "defeat_enemy", enemy: "Bandit Scout", count: 3, minLevel: 1, gold: 80, xp: 60 },
  { name: "Cut Off the Head", description: "Defeat the Bandit Chief and end the raids.", type: "defeat_enemy", enemy: "Bandit Chief", count: 1, minLevel: 2, gold: 120, xp: 100, item: "Chief's Cleaver" },
  { name: "Arena Warm-Up", description: "Win ten fights. Show the crowd what you are made of.", type: "defeat_any", count: 10, minLevel: 3, gold: 150, xp: 120 },
  { name: "Wolf Hunter", description: "A wolf pack terrorizes the forest. Defeat their leader.", type: "defeat_enemy", enemy: "Wolf Pack Leader", count: 3, minLevel: 5, gold: 180, xp: 160 },
  { name: "Boss Hunter", description: "Defeat three bosses anywhere in the land.", type: "defeat_boss", count: 3, minLevel: 6, gold: 350, xp: 300, item: "Hunter's Hood" },
  { name: "Heart of the Mountain", description: "Take down the Stone Golem guarding the mine.", type: "defeat_enemy", enemy: "Stone Golem", count: 2, minLevel: 10, gold: 500, xp: 450 },
  { name: "Champion of the Colosseum", description: "Win thirty fights and earn your place in history.", type: "defeat_any", count: 30, minLevel: 8, gold: 700, xp: 600, item: "King's Warhammer" },
];
for (const [i, q] of quests.entries()) {
  await pool.query(
    `INSERT INTO quests (name, description, type, target_enemy_id, target_count, min_level, reward_gold, reward_xp, reward_item_id, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [q.name, q.description, q.type, q.enemy ? enemyIds.get(q.enemy) : null, q.count, q.minLevel, q.gold, q.xp,
     q.item ? itemIds.get(q.item) : null, i],
  );
}

console.log("seeded areas, shop stock, food and quests");
await pool.end();
