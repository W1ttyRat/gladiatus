import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { loadCharacter } from "../services/character.js";

export const reportRouter = Router();
reportRouter.use(requireAuth);

const REPORT_LIMIT = 30;

/** The latest fights (expeditions and arena) of this character. */
reportRouter.get("/reports", async (req: AuthedRequest, res) => {
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  const { rows } = await pool.query(
    `SELECT id, kind, opponent, won, (player_damage = enemy_damage) AS draw,
            player_damage AS "playerDamage", enemy_damage AS "enemyDamage", created_at AS "createdAt"
       FROM battle_logs WHERE character_id = $1 ORDER BY id DESC LIMIT $2`,
    [c.id, REPORT_LIMIT],
  );
  res.json(rows);
});

reportRouter.get("/reports/:id", async (req: AuthedRequest, res) => {
  const id = z.coerce.number().int().min(1).max(2_000_000_000).safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "Bad report id" });
  const c = await loadCharacter(req.userId!);
  if (!c) return res.status(404).json({ error: "No character" });
  const { rows } = await pool.query(
    `SELECT id, kind, opponent, won, (player_damage = enemy_damage) AS draw, log, rounds,
            player_damage AS "playerDamage", enemy_damage AS "enemyDamage", created_at AS "createdAt"
       FROM battle_logs WHERE id = $1 AND character_id = $2`,
    [id.data, c.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Report not found" });
  res.json(rows[0]);
});
