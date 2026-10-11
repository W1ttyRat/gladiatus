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
- Enemies roll their loot table on a win: main gear piece (40%, boss 60%), and enemies 2 and 3 of each area can also drop an amulet or ring (15%). Each drop rolls independently. Enemy strength is `2.5 + 1.5*level` (boss x1.6), deliberately low early on. Quests (`defeat_enemy`, `defeat_any`, `defeat_boss`) are accepted, progress on battle wins, then claimed for gold/xp/item. Starter: Rusty Sword.
- Arena: fight other players (within 5 levels) for 1 AP; Elo rating (`eloDelta`), gold on a win, only the attacker loses HP. Training: gold -> +1 base stat, cost `base^2/2`. Daily reward: gold scales with level and a streak up to 7 days, plus 5 AP; resets after a missed day.
- Client pages live in `client/src/pages/`; add a page by adding it to `NAV` in `App.tsx`.
- `simulateBattle` is a pure function with an injectable RNG; battle logic lives in `server/src/game/`, HTTP in `routes/`.

## Skills
- task-observer lives in `.claude/skills/task-observer/`. Invoke it before the first tool call of any session and before proposing a plan.

## Enemy knowledge
- Enemy stats are hidden until the player attacks them (`enemy_knowledge.attacks`, counted for wins and losses). 1+ attacks: stat shown as a word relative to the player's own stat; exact numbers unlock per stat at 4/6/8/10/12 attacks (`NUMBER_REVEAL_ATTACKS` in `game/stats.ts`). The server only sends what the player may see (`StatView`); never put raw enemy stats in an API response.
- Mob portraits are SVGs in `client/public/mobs/<slug>.svg` (slug = lowercased name, non-alphanumerics -> `-`). Replace a file with real art of the same name to change a portrait.

## Packages (loot inbox)
- Battle drops and quest item rewards go into the `packages` table, not straight into the inventory. They expire after 7 days (`expires_at` default in `005_packages.sql`; expired rows are deleted when the list is read and ignored everywhere else).
- The Packages page drags a package onto the inventory panel (HTML5 drag and drop, plus a Take button) which calls `POST /api/packages/:id/claim`. The inventory holds `INVENTORY_CAPACITY` (30) unequipped items; claiming or buying when full is refused.
- Shop purchases still go directly to the inventory. `packageCount` is part of the character DTO and drives the sidebar badge.
