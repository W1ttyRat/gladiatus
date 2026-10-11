import { useCallback, useEffect, useState } from 'react'
import { api, type Character, type Food, type ShopItem } from '../api'
import { bonusText } from '../components/ItemInfo'

const TABS = [
  { id: 'weapons', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'rings', label: 'Rings' },
  { id: 'amulets', label: 'Amulets' },
  { id: 'food', label: 'Food' },
] as const
type Tab = (typeof TABS)[number]['id']

export default function Shops({ character, onCharacter }: { character: Character; onCharacter: (c: Character) => void }) {
  const [tab, setTab] = useState<Tab>('weapons')
  const [items, setItems] = useState<ShopItem[]>([])
  const [foods, setFoods] = useState<Food[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async (t: Tab) => {
    if (t === 'food') setFoods(await api.food())
    else setItems(await api.shop(t))
  }, [])

  useEffect(() => {
    load(tab).catch((e: Error) => setError(e.message))
  }, [tab, load, character.stats.charisma.total])

  async function act(fn: () => Promise<string>) {
    setError('')
    setMessage('')
    try {
      setMessage(await fn())
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const buy = (item: ShopItem) =>
    act(async () => {
      const res = await api.buy(item.id)
      onCharacter(res.character)
      return `Bought ${item.name}. Find it in your inventory.`
    })

  const eat = (food: Food) =>
    act(async () => {
      const res = await api.eat(food.id)
      onCharacter(res.character)
      return `You enjoy the ${food.name} and recover ${res.healed} health.`
    })

  return (
    <>
      <h2>Shops</h2>
      <p className="muted">
        You have <strong className="gold">{character.gold} gold</strong>. Your charisma gives you a {(character.derived.shopDiscount * 100).toFixed(1)}% discount.
      </p>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>
      {error && <p className="error">{error}</p>}
      {message && <p className="win">{message}</p>}

      {tab !== 'food' &&
        items.map((i) => {
          const tooLow = character.level < i.minLevel
          return (
            <div key={i.id} className={`card enemy ${tooLow ? 'locked' : ''}`}>
              <div>
                <strong>{i.name}</strong> <span className="muted">({i.slot})</span>
                <div className="bonus">{bonusText(i)}</div>
                {tooLow && <div className="muted">Requires level {i.minLevel}</div>}
              </div>
              <button disabled={tooLow || character.gold < i.price} onClick={() => buy(i)}>Buy {i.price}g</button>
            </div>
          )
        })}

      {tab === 'food' &&
        foods.map((f) => {
          const tooLow = character.level < f.minLevel
          return (
            <div key={f.id} className={`card enemy ${tooLow ? 'locked' : ''}`}>
              <div>
                <strong>{f.name}</strong>
                <div className="bonus">Restores {f.healPct}% of max health (+{f.healAmount} HP)</div>
                {tooLow && <div className="muted">Requires level {f.minLevel}</div>}
              </div>
              <button disabled={tooLow || character.gold < f.price || character.hp >= character.maxHp} onClick={() => eat(f)}>
                Eat {f.price}g
              </button>
            </div>
          )
        })}
    </>
  )
}
