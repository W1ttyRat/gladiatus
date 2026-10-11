export const STAT_KEYS = ['strength', 'dexterity', 'constitution', 'charisma', 'intelligence'] as const
export type StatKey = (typeof STAT_KEYS)[number]

export const STAT_INFO: Record<StatKey, { label: string; help: string }> = {
  strength: { label: 'Strength', help: 'More damage and a higher chance of a double attack' },
  dexterity: { label: 'Dexterity', help: 'Hit more often and land more critical hits' },
  constitution: { label: 'Constitution', help: 'More max health, less damage taken, faster regeneration' },
  charisma: { label: 'Charisma', help: 'Chance of a double attack, more gold from fights, cheaper shops' },
  intelligence: { label: 'Intelligence', help: 'Chance to block a hit completely, more XP from fights' },
}

export interface Character {
  id: number
  level: number
  xp: number
  xpToNext: number
  gold: number
  hp: number
  maxHp: number
  statPoints: number
  packageCount: number
  arenaRating: number
  stats: Record<StatKey, { base: number; bonus: number; total: number }>
  derived: {
    doubleAttackChance: number
    critChance: number
    blockChance: number
    damageReduction: number
    regenPerMinute: number
    goldBonus: number
    xpBonus: number
    shopDiscount: number
  }
  ap: number
  maxAp: number
}

export type StatView =
  | { kind: 'hidden' }
  | { kind: 'rating'; label: string; tone: 'easy' | 'even' | 'hard' }
  | { kind: 'number'; value: number }

export interface Enemy {
  id: number
  name: string
  level: number
  isBoss: boolean
  image: string
  attacks: number
  stats: Record<StatKey, StatView>
  defeated: boolean
  unlocked: boolean
}

export interface Area {
  id: number
  name: string
  minLevel: number
  unlocked: boolean
  enemies: Enemy[]
}

export type Slot = 'weapon' | 'helmet' | 'armor' | 'boots' | 'ring' | 'amulet'

export interface ItemStats {
  strength: number
  dexterity: number
  constitution: number
  charisma: number
  intelligence: number
  hp: number
}

export interface InventoryItem extends ItemStats {
  id: number
  name: string
  slot: Slot
  equipped: boolean
  sellPrice: number
}

export interface PackageItem extends ItemStats {
  id: number
  name: string
  slot: Slot
  source: string
  createdAt: string
  expiresAt: string
}

export interface PackagesOverview {
  character: Character
  packages: PackageItem[]
  inventory: InventoryItem[]
  capacity: number
  used: number
}

export interface ShopItem extends ItemStats {
  id: number
  name: string
  slot: Slot
  minLevel: number
  price: number
}

export interface Food {
  id: number
  name: string
  healPct: number
  healAmount: number
  minLevel: number
  price: number
}

export interface Quest {
  id: number
  name: string
  description: string
  type: string
  targetEnemy: string | null
  targetCount: number
  minLevel: number
  rewardGold: number
  rewardXp: number
  rewardItem: string | null
  status: 'available' | 'active' | 'completed' | 'claimed'
  progress: number
  locked: boolean
}

export interface RankingRow {
  username: string
  level: number
  xp: number
  gold: number
  arenaRating: number
  enemiesDefeated: number
}

export interface BattleResponse {
  won: boolean
  draw: boolean
  playerDamage: number
  enemyDamage: number
  drops: { name: string; slot: string }[]
  log: string[]
  levelsGained: number
  ratingChange?: number
  goldGain?: number
  character: Character
}

export interface ArenaOpponent {
  id: number
  username: string
  level: number
  rating: number
}

export interface DailyStatus {
  streak: number
  claimedToday: boolean
  nextStreak: number
  nextGold: number
  apBonus: number
}

const TOKEN_KEY = 'gladiatus_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`)
  return body as T
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

type CharInv = { character: Character; inventory: InventoryItem[] }

export const api = {
  login: (username: string, password: string) => post<{ token: string }>('/auth/login', { username, password }),
  register: (username: string, password: string) => post<{ token: string }>('/auth/register', { username, password }),
  me: () => request<Character>('/auth/me'),
  areas: () => request<Area[]>('/areas'),
  attack: (enemyId: number) => post<BattleResponse>(`/battle/${enemyId}`),
  allocate: (stat: StatKey, amount = 1) => post<Character>('/stats/allocate', { stat, amount }),
  inventory: () => request<InventoryItem[]>('/inventory'),
  equip: (id: number) => post<CharInv>(`/inventory/${id}/equip`),
  unequip: (id: number) => post<CharInv>(`/inventory/${id}/unequip`),
  sell: (id: number) => post<CharInv>(`/inventory/${id}/sell`),
  packages: () => request<PackagesOverview>('/packages'),
  claimPackage: (id: number) => post<PackagesOverview>(`/packages/${id}/claim`),
  shop: (category: string) => request<ShopItem[]>(`/shop/${category}`),
  food: () => request<Food[]>('/shop/food'),
  buy: (itemId: number) => post<{ character: Character }>(`/shop/buy/${itemId}`),
  eat: (foodId: number) => post<{ character: Character; healed: number }>(`/shop/eat/${foodId}`),
  quests: () => request<Quest[]>('/quests'),
  acceptQuest: (id: number) => post<{ quests: Quest[] }>(`/quests/${id}/accept`),
  claimQuest: (id: number) => post<{ character: Character; quests: Quest[]; levelsGained: number }>(`/quests/${id}/claim`),
  arena: () => request<{ rating: number; opponents: ArenaOpponent[] }>('/arena'),
  arenaFight: (id: number) => post<BattleResponse>(`/arena/${id}`),
  daily: () => request<DailyStatus>('/daily'),
  claimDaily: () => post<{ character: Character; gold: number; streak: number }>('/daily/claim'),
  training: () => request<{ costs: Record<StatKey, number> }>('/training'),
  train: (stat: StatKey) => post<{ character: Character; costs: Record<StatKey, number> }>(`/training/${stat}`),
  rankings: () => request<RankingRow[]>('/rankings'),
}
