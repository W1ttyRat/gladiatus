export interface Character {
  id: number
  level: number
  xp: number
  xpToNext: number
  gold: number
  hp: number
  maxHp: number
  strength: number
  dexterity: number
  bonus: { strength: number; dexterity: number; hp: number }
  ap: number
  maxAp: number
}

export interface Enemy {
  id: number
  name: string
  level: number
  isBoss: boolean
  strength: number
  dexterity: number
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

export type Slot = 'weapon' | 'helmet' | 'armor' | 'boots'

export interface InventoryItem {
  id: number
  name: string
  slot: Slot
  strength: number
  dexterity: number
  hp: number
  equipped: boolean
}

export interface BattleResponse {
  won: boolean
  draw: boolean
  playerDamage: number
  enemyDamage: number
  drop: { name: string; slot: string } | null
  log: string[]
  levelsGained: number
  character: Character
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

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username: string, password: string) =>
    request<{ token: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request<Character>('/auth/me'),
  areas: () => request<Area[]>('/areas'),
  inventory: () => request<InventoryItem[]>('/inventory'),
  equip: (id: number) =>
    request<{ character: Character; inventory: InventoryItem[] }>(`/inventory/${id}/equip`, { method: 'POST' }),
  unequip: (id: number) =>
    request<{ character: Character; inventory: InventoryItem[] }>(`/inventory/${id}/unequip`, { method: 'POST' }),
  attack: (enemyId: number) => request<BattleResponse>(`/battle/${enemyId}`, { method: 'POST' }),
}
