import { pool } from "./pool.js";

const areas = [
  { name: "Dusty Outskirts", minLevel: 1, enemies: ["Stray Dog", "Bandit Scout", "Rogue Slave", "Bandit Chief"] },
  { name: "Whispering Forest", minLevel: 5, enemies: ["Wolf Pack Leader", "Poacher", "Forest Witch", "Ancient Treant"] },
  { name: "Iron Mountains", minLevel: 10, enemies: ["Cave Bear", "Dwarf Raider", "Stone Golem", "Mountain King"] },
];

await pool.query("TRUNCATE areas RESTART IDENTITY CASCADE");
for (const [ai, a] of areas.entries()) {
  const { rows } = await pool.query(
    "INSERT INTO areas (name, min_level, sort_order) VALUES ($1,$2,$3) RETURNING id",
    [a.name, a.minLevel, ai + 1],
  );
  for (const [ei, name] of a.enemies.entries()) {
    const boss = ei === 3;
    const lvl = a.minLevel + ei;
    const mult = boss ? 1.6 : 1;
    await pool.query(
      `INSERT INTO enemies (area_id, sort_order, is_boss, name, level, max_hp, strength, dexterity, xp_reward, gold_reward)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        rows[0].id, ei + 1, boss, name, lvl,
        Math.round((60 + lvl * 12) * mult), Math.round((6 + lvl * 2) * mult), Math.round((5 + lvl) * mult),
        Math.round((10 + lvl * 5) * mult), Math.round((5 + lvl * 4) * mult),
      ],
    );
  }
}
console.log("seeded", areas.length, "areas");
await pool.end();
