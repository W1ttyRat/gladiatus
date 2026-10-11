-- how often a character has attacked each enemy (drives how much of its stats the player has learned)
CREATE TABLE IF NOT EXISTS enemy_knowledge (
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  enemy_id INT NOT NULL REFERENCES enemies(id) ON DELETE CASCADE,
  attacks INT NOT NULL DEFAULT 0,
  PRIMARY KEY (character_id, enemy_id)
);
