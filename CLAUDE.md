# Gladiatus-style browser game

Text-based browser RPG. Players spend attack points (AP) to fight enemies; battles are auto-resolved on the server and returned as a text log.

## Stack
- `client/`: Vite + React + TypeScript. `/api` is proxied to the server in dev.
- `server/`: Node + Express 5 + TypeScript (run with tsx), PostgreSQL via `pg` (plain SQL, no ORM).

## Commands
- `npm run dev`: server (:3001) and client (:5173) together
- `npm test`: server unit tests (vitest)
- `npm run migrate -w server`: apply `server/src/db/schema.sql`
- `npm run seed -w server`: (re)create areas and enemies (wipes progress)

## Game rules (keep in sync with `server/src/game/rules.ts`)
- Each area has 4 enemies: 3 normal + 1 boss (order 4).
- Enemy N is attackable only after enemy N-1 in the same area was beaten at least once (`progress` table).
- Areas unlock by character level (`areas.min_level`).
- Attacking costs 1 AP; AP regenerates lazily (computed from `ap_updated_at`, no cron).
- `simulateBattle` is a pure function with an injectable RNG; battle logic lives in `server/src/game/`, HTTP in `routes/`.

## Skills
- task-observer lives in `.claude/skills/task-observer/`. Invoke it before the first tool call of any session and before proposing a plan.
