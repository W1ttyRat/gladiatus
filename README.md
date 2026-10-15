# Gladiatus-style browser game

A text-based browser RPG in a Roman arena setting. You spend attack points (AP) to fight enemies; battles are auto-resolved on the server and replayed round by round in the client.

## Stack
- `client/`: Vite + React + TypeScript (`/api` is proxied to the server in dev)
- `server/`: Node + Express 5 + TypeScript (run with tsx), PostgreSQL via `pg` (plain SQL, no ORM)

## Setup
1. In pgAdmin create an empty database named `gladiatus`.
2. `copy server\.env.example server\.env` and fill in your Postgres password and a JWT secret.
3. `npm install`
4. `npm run migrate -w server` then `npm run seed -w server` (run the seed before registering, so new accounts get the starter sword; re-run both after pulling updates). Note that the seed wipes progress.
5. `npm run dev` (server on :3001, client on :5173) and open http://localhost:5173

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | Server and client together |
| `npm test` | Server unit tests (vitest) |
| `npm run migrate -w server` | Apply the numbered SQL files in `server/src/db/` (idempotent; add changes as `00N_name.sql`) |
| `npm run seed -w server` | (Re)create areas and enemies, wiping progress |
| `npm run build` | Build the client for production |

## What is in the game
- **Expeditions**: areas with 3 enemies and a boss. Each enemy unlocks after the previous one is beaten; areas unlock by character level.
- **Combat**: attacks cost 1 AP (regenerates over time). Battles last 10 rounds and the higher total damage wins; a tie is a draw. Damage taken reduces your HP, which regenerates passively, and food restores it.
- **Character**: five stats (strength, dexterity, constitution, charisma, intelligence), 5 points per level-up, training for gold, and gear on a paperdoll (weapon, helmet, armor, boots, amulet, two rings). Drag items onto slots, or double-click them in the backpack.
- **Enemy knowledge**: enemy stats are hidden until you fight them, first as relative words, then as exact numbers after repeated attacks.
- **Arena**: PvP against players within 5 levels, with Elo rating.
- **Economy**: merchants and tavern (charisma gives a discount), auction house (48 h fixed-price listings, 5% fee), quests, daily reward with a streak.
- **Packages**: loot and quest items arrive in an inbox and expire after 7 days; claim them into the 30-slot inventory.
- **Reports and glory**: battle reports with round-by-round replay, successes (achievements) and the Pantheon (rankings by level, arena, defeated enemies or gold).

Detailed rules and design notes live in [CLAUDE.md](CLAUDE.md); the formulas are in `server/src/game/` (`rules.ts`, `stats.ts`, `achievements.ts`).

## Production
`npm run build`, then set `NODE_ENV=production` and a real `JWT_SECRET` (the server refuses to start without one, in any mode), plus `TRUST_PROXY=1` if it sits behind a reverse proxy and run `npm start -w server`; the API then also serves the built client on its port. Login and register are rate limited (50 requests / 15 min per IP).

## Optional Claude Code tooling (not installed by default)
- **claude-mem**: installed as a Claude Code plugin.
- **task-observer**: vendored in `.claude/skills/task-observer/` (source: github.com/rebelytics/one-skill-to-rule-them-all).
- **Headroom** (context-compression proxy) and **OmniRoute** (multi-provider gateway, `npm i -g omniroute`, dashboard on :20128) both work by redirecting `ANTHROPIC_BASE_URL`, so they must be chained rather than used side by side. OmniRoute also holds provider credentials and sees your traffic. Verify each project's own install docs before enabling.
