import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { characterDto, loadCharacter } from "../services/character.js";

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

async function listInventory(characterId: number) {
  const { rows } = await pool.query(
    `SELECT ci.id, ci.equipped, i.name, i.slot, i.strength, i.dexterity, i.hp
       FROM character_items ci JOIN items i ON i.id = ci.item_id
      WHERE ci.character_id = $1 ORDER BY ci.equipped DESC, i.slot, ci.id`,
    [characterId],
  );
  return rows;
}

inventoryRouter.get("/inventory", async (req: AuthedRequest, res) => {
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  res.json(await listInventory(c.id));
});

async function setEquipped(req: AuthedRequest, res: import("express").Response, equip: boolean) {
  const itemId = Number(req.params.id);
  if (!Number.isInteger(itemId)) return res.status(400).json({ error: "Bad item id" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true);
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    const item = (
      await client.query(
        `SELECT ci.id, i.slot FROM character_items ci JOIN items i ON i.id = ci.item_id
          WHERE ci.id = $1 AND ci.character_id = $2`,
        [itemId, c.id],
      )
    ).rows[0];
    if (!item) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Item not found" });
    }
    if (equip) {
      // only one item per slot: take off whatever is worn there first
      await client.query(
        `UPDATE character_items SET equipped = false
          WHERE character_id = $1 AND equipped AND item_id IN (SELECT id FROM items WHERE slot = $2)`,
        [c.id, item.slot],
      );
    }
    await client.query("UPDATE character_items SET equipped = $1 WHERE id = $2", [equip, itemId]);
    // Persist regenerated HP/AP and clamp HP to the new max (unequipping can lower it).
    const updated = await loadCharacter(req.userId!, client);
    const maxHp = updated!.max_hp + updated!.bonus_hp;
    await client.query(`UPDATE characters SET hp = LEAST($1, $2), hp_updated_at = $3 WHERE id = $4`, [
      updated!.hp, maxHp, updated!.hp_updated_at, c.id,
    ]);
    await client.query("COMMIT");
    const fresh = await loadCharacter(req.userId!);
    res.json({ character: characterDto(fresh!), inventory: await listInventory(c.id) });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

inventoryRouter.post("/inventory/:id/equip", (req: AuthedRequest, res) => setEquipped(req, res, true));
inventoryRouter.post("/inventory/:id/unequip", (req: AuthedRequest, res) => setEquipped(req, res, false));
