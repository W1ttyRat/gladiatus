# Gladiatus-style browser game

Text-based browser RPG. Players spend attack points (AP) to fight enemies; battles are auto-resolved on the server and returned as a text log.

## Stack
- `client/`: Vite + React + TypeScript. `/api` is proxied to the server in dev.
- `server/`: Node + Express 5 + TypeScript (run with tsx), PostgreSQL via `pg` (plain SQL, no ORM).

## Commands
- `npm run dev`: server (:3001) and client (:5173) together
- `npm test`: server unit tests (vitest)
- `npm run migrate -w server`: apply the numbered SQL files in `server/src/db/` (idempotent; add new changes as `00N_name.sql`)
- `npm run seed -w server`: (re)create areas and enemies (wipes progress)

## Game rules (keep in sync with `server/src/game/rules.ts`)
- Each area has 4 enemies: 3 normal + 1 boss (order 4).
- Enemy N is attackable only after enemy N-1 in the same area was beaten at least once (`progress` table).
- Areas unlock by character level (`areas.min_level`).
- Attacking costs 1 AP; AP regenerates lazily (computed from `ap_updated_at`, no cron).
- Battles last exactly 10 rounds; whoever dealt the most total damage wins (a tie is a draw, no reward). The damage the enemy dealt is subtracted from the player's HP afterwards (min 1); HP regenerates passively (about 2% of max per minute, faster with CON) and a fight needs >= 10% HP.
- Five stats (strength, dexterity, constitution, charisma, intelligence); formulas for what each does live in `server/src/game/stats.ts`. Level-up grants 5 stat points to spend on the Overview page. Max HP = 100 + 10*CON + gear HP.
- Gear slots: weapon, helmet, armor, boots, amulet (one each) and ring (two at once; equipping a third replaces the oldest) ( bonuses add to stats). Shops (weapons, armor, rings, amulets, food) cost gold; charisma gives a discount; items sell for 40% of base price. Food restores a % of max HP.
- Enemies drop one piece of gear on a win (30%, boss 50%). Quests (`defeat_enemy`, `defeat_any`, `defeat_boss`) are accepted, progress on battle wins, then claimed for gold/xp/item. Starter: Rusty Sword.
- Arena: fight other players (within 5 levels) for 1 AP; Elo rating (`eloDelta`), gold on a win, only the attacker loses HP. Training: gold -> +1 base stat, cost `base^2/2`. Daily reward: gold scales with level and a streak up to 7 days, plus 5 AP; resets after a missed day.
- Client pages live in `client/src/pages/`; add a page by adding it to `NAV` in `App.tsx`.
- `simulateBattle` is a pure function with an injectable RNG; battle logic lives in `server/src/game/`, HTTP in `routes/`.

## Skills
- task-observer lives in `.claude/skills/task-observer/`. Invoke it before the first tool call of any session and before proposing a plan.
