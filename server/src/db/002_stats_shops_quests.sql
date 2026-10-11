-- five stats, rings/amulets, shops, food, quests
ALTER TABLE characters ADD COLUMN IF NOT EXISTS constitution INT NOT NULL DEFAULT 10;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS charisma INT NOT NULL DEFAULT 10;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS intelligence INT NOT NULL DEFAULT 10;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS stat_points INT NOT NULL DEFAULT 0;

ALTER TABLE enemies ADD COLUMN IF NOT EXISTS constitution INT NOT NULL DEFAULT 5;
ALTER TABLE enemies ADD COLUMN IF NOT EXISTS charisma INT NOT NULL DEFAULT 5;
ALTER TABLE enemies ADD COLUMN IF NOT EXISTS intelligence INT NOT NULL DEFAULT 5;

ALTER TABLE items ADD COLUMN IF NOT EXISTS constitution INT NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS charisma INT NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS intelligence INT NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS price INT NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS min_level INT NOT NULL DEFAULT 1;
ALTER TABLE items ADD COLUMN IF NOT EXISTS sold_in_shop BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_slot_check;
ALTER TABLE items ADD CONSTRAINT items_slot_check CHECK (slot IN ('weapon','helmet','armor','boots','ring','amulet'));

CREATE TABLE IF NOT EXISTS foods (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  heal_pct INT NOT NULL,            -- percent of max HP restored
  price INT NOT NULL,
  min_level INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS quests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('defeat_enemy','defeat_any','defeat_boss')),
  target_enemy_id INT REFERENCES enemies(id) ON DELETE CASCADE,
  target_count INT NOT NULL,
  min_level INT NOT NULL DEFAULT 1,
  reward_gold INT NOT NULL DEFAULT 0,
  reward_xp INT NOT NULL DEFAULT 0,
  reward_item_id INT REFERENCES items(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS character_quests (
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  quest_id INT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active','completed','claimed')),
  progress INT NOT NULL DEFAULT 0,
  PRIMARY KEY (character_id, quest_id)
);

-- max HP is now 100 + 10 per constitution (200 at the start)
ALTER TABLE characters ALTER COLUMN hp SET DEFAULT 200;
