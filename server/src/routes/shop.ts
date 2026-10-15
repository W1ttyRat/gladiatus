import { isId } from "./ids.js";
import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { INVENTORY_CAPACITY } from "../game/rules.js";
import { shopDiscount } from "../game/stats.js";
import { characterDto, loadCharacter, total, totalMaxHp } from "../services/character.js";

export const shopRouter = Router();
shopRouter.use(requireAuth);

const CATEGORIES: Record<string, string[]> = {
  weapons: ["weapon"],
  armor: ["helmet", "armor", "boots"],
  rings: ["ring"],
  amulets: ["amulet"],
};

/** Charisma lowers every shop price. */
const priceFor = (base: number, cha: number) => Math.max(1, Math.round(base * (1 - shopDiscount(cha))));

shopRouter.get("/shop/food", async (req: AuthedRequest, res) => {
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  const { rows } = await pool.query("SELECT id, name, heal_pct, price, min_level FROM foods ORDER BY price");
  res.json(
    rows.map((f) => ({
      id: f.id, name: f.name, healPct: f.heal_pct, minLevel: f.min_level,
      price: priceFor(f.price, total(c, "charisma")),
      healAmount: Math.round((totalMaxHp(c) * f.heal_pct) / 100),
    })),
  );
});

shopRouter.get("/shop/:category", async (req: AuthedRequest, res) => {
  const slots = CATEGORIES[req.params.category as string];
  if (!slots) return res.status(404).json({ error: "Unknown shop" });
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  const { rows } = await pool.query(
    `SELECT id, name, slot, strength, dexterity, constitution, charisma, intelligence, hp, price, min_level
       FROM items WHERE sold_in_shop AND slot = ANY($1) ORDER BY min_level, price`,
    [slots],
  );
  res.json(
    rows.map((i) => ({
      id: i.id, name: i.name, slot: i.slot, minLevel: i.min_level,
      strength: i.strength, dexterity: i.dexterity, constitution: i.constitution,
      charisma: i.charisma, intelligence: i.intelligence, hp: i.hp,
      price: priceFor(i.price, total(c, "charisma")),
    })),
  );
});

shopRouter.post("/shop/buy/:itemId", async (req: AuthedRequest, res) => {
  const itemId = Number(req.params.itemId);
  if (!isId(itemId)) return res.status(400).json({ error: "Bad item id" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true);
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    const item = (await client.query("SELECT * FROM items WHERE id = $1 AND sold_in_shop", [itemId])).rows[0];
    if (!item) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Item not for sale" });
    }
    const price = priceFor(item.price, total(c, "charisma"));
    if (c.level < item.min_level) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: `Requires level ${item.min_level}` });
    }
    if (c.gold < price) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Not enough gold" });
    }
    const used = (await client.query("SELECT COUNT(*)::int AS n FROM character_items WHERE character_id = $1 AND NOT equipped", [c.id])).rows[0].n;
    if (used >= INVENTORY_CAPACITY) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Your inventory is full. Sell something first." });
    }
    await client.query("UPDATE characters SET gold = gold - $1 WHERE id = $2", [price, c.id]);
    await client.query("INSERT INTO character_items (character_id, item_id) VALUES ($1,$2)", [c.id, item.id]);
    await client.query("COMMIT");
    res.json({ character: characterDto((await loadCharacter(req.userId!))!) });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

shopRouter.post("/shop/eat/:foodId", async (req: AuthedRequest, res) => {
  const foodId = Number(req.params.foodId);
  if (!isId(foodId)) return res.status(400).json({ error: "Bad food id" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true);
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    const food = (await client.query("SELECT * FROM foods WHERE id = $1", [foodId])).rows[0];
    if (!food) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Food not found" });
    }
    const maxHp = totalMaxHp(c);
    const price = priceFor(food.price, total(c, "charisma"));
    if (c.level < food.min_level) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: `Requires level ${food.min_level}` });
    }
    if (c.hp >= maxHp) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "You are already at full health" });
    }
    if (c.gold < price) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Not enough gold" });
    }
    const hp = Math.min(maxHp, c.hp + Math.round((maxHp * food.heal_pct) / 100));
    // regeneration timer restarts now; the stored HP already includes regeneration up to this moment
    await client.query("UPDATE characters SET gold = gold - $1, hp = $2, hp_updated_at = now() WHERE id = $3", [price, hp, c.id]);
    await client.query("COMMIT");
    res.json({ character: characterDto((await loadCharacter(req.userId!))!), healed: hp - c.hp });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
