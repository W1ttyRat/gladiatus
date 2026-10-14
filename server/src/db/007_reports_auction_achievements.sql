-- battle reports now cover arena fights too (no enemy row), and remember who the opponent was
ALTER TABLE battle_logs ALTER COLUMN enemy_id DROP NOT NULL;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'expedition';
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS opponent TEXT;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS player_damage INT NOT NULL DEFAULT 0;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS enemy_damage INT NOT NULL DEFAULT 0;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS rounds JSONB;
CREATE INDEX IF NOT EXISTS battle_logs_character_idx ON battle_logs (character_id, created_at DESC);

-- player to player market: a listing holds the item while it is for sale
CREATE TABLE IF NOT EXISTS auctions (
  id SERIAL PRIMARY KEY,
  seller_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  price INT NOT NULL CHECK (price > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '48 hours'
);
CREATE INDEX IF NOT EXISTS auctions_expiry_idx ON auctions (expires_at);

-- achievements ("successes"): a row means the reward was claimed
CREATE TABLE IF NOT EXISTS character_achievements (
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  achievement TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (character_id, achievement)
);
