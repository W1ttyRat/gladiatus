CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS characters (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  gold INT NOT NULL DEFAULT 0,
  max_hp INT NOT NULL DEFAULT 100,
  strength INT NOT NULL DEFAULT 10,
  dexterity INT NOT NULL DEFAULT 10,
  ap INT NOT NULL DEFAULT 20,
  ap_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS areas (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  min_level INT NOT NULL,
  sort_order INT NOT NULL
);

CREATE TABLE IF NOT EXISTS enemies (
  id SERIAL PRIMARY KEY,
  area_id INT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,            -- 1..4 inside the area
  is_boss BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL,
  level INT NOT NULL,
  max_hp INT NOT NULL,
  strength INT NOT NULL,
  dexterity INT NOT NULL,
  xp_reward INT NOT NULL,
  gold_reward INT NOT NULL,
  UNIQUE (area_id, sort_order)
);

-- a row means: this character has beaten this enemy at least once
CREATE TABLE IF NOT EXISTS progress (
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  enemy_id INT NOT NULL REFERENCES enemies(id) ON DELETE CASCADE,
  defeated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (character_id, enemy_id)
);

CREATE TABLE IF NOT EXISTS battle_logs (
  id SERIAL PRIMARY KEY,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  enemy_id INT NOT NULL REFERENCES enemies(id) ON DELETE CASCADE,
  won BOOLEAN NOT NULL,
  log JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
