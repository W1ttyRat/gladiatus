-- arena rating (Elo-style) and daily reward streak
ALTER TABLE characters ADD COLUMN IF NOT EXISTS arena_rating INT NOT NULL DEFAULT 1000;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS last_daily_claim DATE;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS daily_streak INT NOT NULL DEFAULT 0;
