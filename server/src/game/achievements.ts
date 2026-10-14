export type Metric = "wins" | "arenaWins" | "bosses" | "level" | "rating" | "quests" | "gold";

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  metric: Metric;
  goal: number;
  rewardGold: number;
}

/** Achievements ("successes"): progress is computed from the game state, only the claim is stored. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "wins-10", name: "First Blood", description: "Win 10 expedition fights", metric: "wins", goal: 10, rewardGold: 50 },
  { key: "wins-50", name: "Seasoned Fighter", description: "Win 50 expedition fights", metric: "wins", goal: 50, rewardGold: 250 },
  { key: "wins-200", name: "Scourge of the Roads", description: "Win 200 expedition fights", metric: "wins", goal: 200, rewardGold: 1000 },
  { key: "wins-1000", name: "Living Legend", description: "Win 1000 expedition fights", metric: "wins", goal: 1000, rewardGold: 5000 },
  { key: "boss-1", name: "Giant Slayer", description: "Defeat your first boss", metric: "bosses", goal: 1, rewardGold: 100 },
  { key: "boss-3", name: "Bane of Tyrants", description: "Defeat 3 different bosses", metric: "bosses", goal: 3, rewardGold: 600 },
  { key: "arena-1", name: "Into the Sand", description: "Win a fight in the arena", metric: "arenaWins", goal: 1, rewardGold: 50 },
  { key: "arena-10", name: "Crowd Favourite", description: "Win 10 fights in the arena", metric: "arenaWins", goal: 10, rewardGold: 400 },
  { key: "arena-50", name: "Champion of the Sand", description: "Win 50 fights in the arena", metric: "arenaWins", goal: 50, rewardGold: 2000 },
  { key: "rating-1200", name: "Rising Star", description: "Reach an arena rating of 1200", metric: "rating", goal: 1200, rewardGold: 300 },
  { key: "rating-1500", name: "Gladiator of Rome", description: "Reach an arena rating of 1500", metric: "rating", goal: 1500, rewardGold: 1500 },
  { key: "level-5", name: "Out of the Pit", description: "Reach level 5", metric: "level", goal: 5, rewardGold: 100 },
  { key: "level-10", name: "Veteran", description: "Reach level 10", metric: "level", goal: 10, rewardGold: 500 },
  { key: "level-20", name: "Hero of the Empire", description: "Reach level 20", metric: "level", goal: 20, rewardGold: 3000 },
  { key: "quests-1", name: "Errand Runner", description: "Complete a quest", metric: "quests", goal: 1, rewardGold: 50 },
  { key: "quests-8", name: "Trusted by the Locals", description: "Complete 8 quests", metric: "quests", goal: 8, rewardGold: 500 },
  { key: "gold-1000", name: "Deep Pockets", description: "Hold 1,000 gold at once", metric: "gold", goal: 1000, rewardGold: 100 },
  { key: "gold-25000", name: "Patrician Purse", description: "Hold 25,000 gold at once", metric: "gold", goal: 25000, rewardGold: 1500 },
];
