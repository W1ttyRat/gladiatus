import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { characterDto, loadCharacter } from "../services/character.js";

export const auctionRouter = Router();
auctionRouter.use(requireAuth);

export const AUCTION_FEE = 0.05; // the house keeps 5% of every sale
export const MAX_LISTINGS = 10;
export const MAX_PRICE = 1_000_000;

const SELECT = `
  SELECT a.id, a.price, a.created_at AS "createdAt", a.expires_at AS "expiresAt", u.username AS seller,
         i.name, i.slot, i.strength, i.dexterity, i.constitution, i.charisma, i.intelligence, i.hp, i.min_level AS "minLevel"
    FROM auctions a JOIN items i ON i.id = a.item_id
    JOIN characters c ON c.id = a.seller_id JOIN users u ON u.id = c.user_id`;

/** Unsold listings whose time ran out go back to their seller's packages. Runs whenever the market is read. */
async function returnExpired() {
  await pool.query(
    `WITH gone AS (DELETE FROM auctions WHERE expires_at <= now() RETURNING seller_id, item_id)
     INSERT INTO packages (character_id, item_id, source) SELECT seller_id, item_id, 'Unsold auction' FROM gone`,
  );
}

const filters = z.object({
  slot: z.enum(["weapon", "helmet", "armor", "boots", "ring", "amulet"]).optional(),
  sort: z.enum(["price", "newest"]).default("price"),
});

auctionRouter.get("/auction", async (req: AuthedRequest, res) => {
  const f = filters.safeParse(req.query);
  if (!f.success) return res.status(400).json({ error: "Bad filter" });
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  await returnExpired();
  const { rows } = await pool.query(
    `${SELECT} WHERE ($1::text IS NULL OR i.slot = $1) AND a.seller_id <> $2
      ORDER BY ${f.data.sort === "price" ? "a.price, a.id" : "a.id DESC"} LIMIT 60`,
    [f.data.slot ?? null, c.id],
  );
  res.json(rows);
});

auctionRouter.get("/auction/mine", async (req: AuthedRequest, res) => {
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  await returnExpired();
  const { rows } = await pool.query(`${SELECT} WHERE a.seller_id = $1 ORDER BY a.expires_at`, [c.id]);
  res.json({ listings: rows, max: MAX_LISTINGS, fee: AUCTION_FEE });
});

const listBody = z.object({ itemId: z.number().int().min(1).max(2_000_000_000), price: z.number().int().min(1).max(MAX_PRICE) });

/** Put an unequipped inventory item up for sale. */
auctionRouter.post("/auction", async (req: AuthedRequest, res) => {
  const body = listBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: `Price must be a whole number from 1 to ${MAX_PRICE}` });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true);
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    const active = (await client.query("SELECT COUNT(*)::int AS n FROM auctions WHERE seller_id = $1 AND expires_at > now()", [c.id])).rows[0].n;
    if (active >= MAX_LISTINGS) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `You can have at most ${MAX_LISTINGS} listings at once` });
    }
    // deleting the inventory row is the guard: equipped or foreign items match nothing
    const item = (
      await client.query("DELETE FROM character_items WHERE id = $1 AND character_id = $2 AND NOT equipped RETURNING item_id", [body.data.itemId, c.id])
    ).rows[0];
    if (!item) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Item not found, or still equipped" });
    }
    await client.query("INSERT INTO auctions (seller_id, item_id, price) VALUES ($1,$2,$3)", [c.id, item.item_id, body.data.price]);
    await client.query("COMMIT");
    res.status(201).json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

/** Buy a listing. The item arrives in the buyer's packages, the seller is paid minus the fee. */
auctionRouter.post("/auction/:id/buy", async (req: AuthedRequest, res) => {
  const id = z.coerce.number().int().min(1).max(2_000_000_000).safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "Bad listing id" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true);
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    // deleting is the guard: a listing that was sold, withdrawn or expired matches no row
    const a = (
      await client.query("DELETE FROM auctions WHERE id = $1 AND expires_at > now() AND seller_id <> $2 RETURNING seller_id, item_id, price", [id.data, c.id])
    ).rows[0];
    if (!a) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "That listing is gone (sold, withdrawn or your own)" });
    }
    if (c.gold < a.price) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Not enough gold" });
    }
    await client.query("UPDATE characters SET gold = gold - $1 WHERE id = $2", [a.price, c.id]);
    await client.query("UPDATE characters SET gold = gold + $1 WHERE id = $2", [Math.floor(a.price * (1 - AUCTION_FEE)), a.seller_id]);
    await client.query("INSERT INTO packages (character_id, item_id, source) VALUES ($1,$2,'Auction house')", [c.id, a.item_id]);
    await client.query("COMMIT");
    res.json({ character: characterDto((await loadCharacter(req.userId!))!) });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

/** Withdraw your own listing; the item goes back to your packages. */
auctionRouter.post("/auction/:id/cancel", async (req: AuthedRequest, res) => {
  const id = z.coerce.number().int().min(1).max(2_000_000_000).safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "Bad listing id" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await loadCharacter(req.userId!, client, true);
    if (!c) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No character" });
    }
    const a = (await client.query("DELETE FROM auctions WHERE id = $1 AND seller_id = $2 RETURNING item_id", [id.data, c.id])).rows[0];
    if (!a) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Listing not found (it may have just sold)" });
    }
    await client.query("INSERT INTO packages (character_id, item_id, source) VALUES ($1,$2,'Withdrawn auction')", [c.id, a.item_id]);
    await client.query("COMMIT");
    res.json({ character: characterDto((await loadCharacter(req.userId!))!) });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
