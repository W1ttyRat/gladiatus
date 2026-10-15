import { MAX_ID } from "./ids.js";
import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { INVENTORY_CAPACITY } from "../game/rules.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { characterDto, loadCharacter } from "../services/character.js";
import { listInventory } from "./inventory.js";

export const packageRouter = Router();
packageRouter.use(requireAuth);

async function listPackages(characterId: number) {
  // expired packages are simply gone; delete them whenever the list is read
  await pool.query("DELETE FROM packages WHERE character_id = $1 AND expires_at <= now()", [characterId]);
  const { rows } = await pool.query(
    `SELECT p.id, p.source, p.created_at AS "createdAt", p.expires_at AS "expiresAt",
            i.name, i.slot, i.strength, i.dexterity, i.constitution, i.charisma, i.intelligence, i.hp
       FROM packages p JOIN items i ON i.id = p.item_id
      WHERE p.character_id = $1 ORDER BY p.expires_at, p.id`,
    [characterId],
  );
  return rows;
}

async function overview(userId: number, characterId: number) {
  const inventory = await listInventory(characterId);
  return {
    character: characterDto((await loadCharacter(userId))!),
    packages: await listPackages(characterId),
    inventory,
    capacity: INVENTORY_CAPACITY,
    used: inventory.filter((i) => !i.equipped).length,
  };
}

packageRouter.get("/packages", async (req: AuthedRequest, res) => {
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  res.json(await overview(req.userId!, c.id));
});

/** Moves a package's item into the inventory (this is what the drag-and-drop calls). */
packageRouter.post("/packages/:id/claim", async (req: AuthedRequest, res) => {
  const id = z.coerce.number().int().min(1).max(MAX_ID).safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "Bad package id" });
  const client = await pool.connect();
  let characterId = 0;
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true);
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    characterId = c.id;
    const used = (await client.query("SELECT COUNT(*)::int AS n FROM character_items WHERE character_id = $1 AND NOT equipped", [c.id])).rows[0].n;
    if (used >= INVENTORY_CAPACITY) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Your inventory is full. Sell or equip something first." });
    }
    // deleting is the guard: an expired or already-claimed package matches no row
    const pkg = (
      await client.query("DELETE FROM packages WHERE id = $1 AND character_id = $2 AND expires_at > now() RETURNING item_id", [id.data, c.id])
    ).rows[0];
    if (!pkg) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "That package is gone (expired or already taken)" });
    }
    await client.query("INSERT INTO character_items (character_id, item_id) VALUES ($1,$2)", [c.id, pkg.item_id]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  res.json(await overview(req.userId!, characterId));
});
