import { pool } from "./pool.js";

// Per area: names of the dropped item for enemy 1, 2, 3 and the boss (helmet, armor, boots, weapon).
const areas = [
  {
    name: "Dusty Outskirts", minLevel: 1,
    enemies: ["Stray Dog", "Bandit Scout", "Rogue Slave", "Bandit Chief"],
    items: ["Leather Cap", "Padded Vest", "Worn Boots", "Chief's Cleaver"],
  },
  {
    name: "Whispering Forest", minLevel: 5,
    enemies: ["Wolf Pack Leader", "Poacher", "Forest Witch", "Ancient Treant"],
    items: ["Hunter's Hood", "Wolfhide Jerkin", "Silent Boots", "Treant Branch"],
  },
  {
    name: "Iron Mountains", minLevel: 10,
    enemies: ["Cave Bear", "Dwarf Raider", "Stone Golem", "Mountain King"],
    items: ["Iron Helm", "Dwarven Plate", "Mountain Greaves", "King's Warhammer"],
  },
];

const slots = ["helmet", "armor", "boots", "weapon"] as const;
// stat bonuses per tier, by slot
const statsFor = (slot: (typeof slots)[number], t: number) =>
  ({
    helmet: { strength: 0, dexterity: t, hp: 8 * t },
    armor: { strength: 0, dexterity: 0, hp: 15 * t },
    boots: { strength: 0, dexterity: 2 * t, hp: 4 * t },
    weapon: { strength: 3 * t, dexterity: t, hp: 0 },
  })[slot];

await pool.query("TRUNCATE areas, items RESTART IDENTITY CASCADE");

await pool.query("INSERT INTO items (name, slot, strength, dexterity, hp) VALUES ('Rusty Sword','weapon',2,0,0)");

for (const [ai, a] of areas.entries()) {
  const tier = ai + 1;
  const { rows } = await pool.query(
    "INSERT INTO areas (name, min_level, sort_order) VALUES ($1,$2,$3) RETURNING id",
    [a.name, a.minLevel, tier],
  );
  for (const [ei, name] of a.enemies.entries()) {
    const boss = ei === 3;
    const lvl = a.minLevel + ei;
    const mult = boss ? 1.6 : 1;
    const enemy = await pool.query(
      `INSERT INTO enemies (area_id, sort_order, is_boss, name, level, max_hp, strength, dexterity, xp_reward, gold_reward)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [
        rows[0].id, ei + 1, boss, name, lvl,
        Math.round((60 + lvl * 12) * mult), Math.round((6 + lvl * 2) * mult), Math.round((5 + lvl) * mult),
        Math.round((10 + lvl * 5) * mult), Math.round((5 + lvl * 4) * mult),
      ],
    );
    const slot = slots[ei];
    const s = statsFor(slot, tier);
    const item = await pool.query(
      "INSERT INTO items (name, slot, strength, dexterity, hp) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [a.items[ei], slot, s.strength, s.dexterity, s.hp],
    );
    await pool.query("INSERT INTO enemy_drops (enemy_id, item_id, chance) VALUES ($1,$2,$3)", [
      enemy.rows[0].id, item.rows[0].id, boss ? 0.5 : 0.3,
    ]);
  }
}
console.log("seeded", areas.length, "areas and their items");
await pool.end();
