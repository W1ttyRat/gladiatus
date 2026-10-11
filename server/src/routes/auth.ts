import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { JWT_SECRET, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { characterDto, loadCharacter } from "../services/character.js";

export const authRouter = Router();

const creds = z.object({
  username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(100),
});

const sign = (userId: number) => jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: "7d" });

authRouter.post("/register", async (req, res) => {
  const parsed = creds.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Username 3-20 chars (letters, digits, _), password 6+ chars" });
  const { username, password } = parsed.data;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const hash = await bcrypt.hash(password, 10);
    const u = await client.query("INSERT INTO users (username, password_hash) VALUES ($1,$2) RETURNING id", [username, hash]);
    const ch = await client.query("INSERT INTO characters (user_id) VALUES ($1) RETURNING id", [u.rows[0].id]);
    // starter weapon, already equipped (needs `npm run seed` to have run)
    await client.query("INSERT INTO character_items (character_id, item_id, equipped) SELECT $1, id, true FROM items WHERE name = $2", [ch.rows[0].id, "Rusty Sword"]);
    await client.query("COMMIT");
    res.status(201).json({ token: sign(u.rows[0].id) });
  } catch (e: any) {
    await client.query("ROLLBACK");
    if (e.code === "23505") return res.status(409).json({ error: "Username already taken" });
    throw e;
  } finally {
    client.release();
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = creds.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid credentials" });
  const { rows } = await pool.query("SELECT id, password_hash FROM users WHERE username = $1", [parsed.data.username]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(parsed.data.password, u.password_hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  res.json({ token: sign(u.id) });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  res.json(characterDto(c));
});
