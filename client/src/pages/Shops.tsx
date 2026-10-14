import { useCallback, useEffect, useState } from 'react'
import { api, type Character, type Food, type ShopItem } from '../api'
import Icon from '../components/Icon'
import { bonusText, ItemCell, qualityOf, SLOT_LABEL } from '../components/items'
import { useAction, useToast } from '../components/Toast'

const TABS = [
  { id: 'weapons', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'rings', label: 'Rings' },
  { id: 'amulets', label: 'Amulets' },
  { id: 'food', label: 'Tavern' },
] as const
type Tab = (typeof TABS)[number]['id']

export default function Shops({ character, onCharacter }: { character: Character; onCharacter: (c: Character) => void }) {
  const [tab, setTab] = useState<Tab>('weapons')
  const [items, setItems] = useState<ShopItem[]>([])
  const [foods, setFoods] = useState<Food[]>([])
  const act = useAction()
  const toast = useToast()

  const load = useCallback(
    async (t: Tab) => {
      if (t === 'food') setFoods((await act(api.food)) ?? [])
      else setItems((await act(() => api.shop(t))) ?? [])
    },
    [act],
  )
  useEffect(() => { load(tab) }, [tab, load, character.derived.shopDiscount])

  async function buy(item: ShopItem) {
    const res = await act(() => api.buy(item.id))
    if (res) {
      onCharacter(res.character)
      toast(`Bought ${item.name}. It is in your backpack.`)
    }
  }
  async function eat(food: Food) {
    const res = await act(() => api.eat(food.id))
    if (res) {
      onCharacter(res.character)
      toast(`You eat the ${food.name.toLowerCase()} and recover ${res.healed} health.`)
    }
  }

  const missing = character.maxHp - character.hp

  return (
    <>
      <h2>Merchants</h2>
      <p className="lede">
        Your charisma earns you {(character.derived.shopDiscount * 100).toFixed(1)}% off every price. Merchants buy back your spare gear
        at 40% of its value; for a better price, try the auction house.
      </p>
      <nav className="chips" aria-label="Shops">
        {TABS.map((t) => (
          <button key={t.id} className={`chip ${t.id === tab ? 'on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>

      {tab === 'food' ? (
        <>
          <p className="hint">{missing <= 0 ? 'You are at full health.' : `You are missing ${missing} health.`}</p>
          <ul className="shelf">
            {foods.map((f) => {
              const tooLow = character.level < f.minLevel
              const needed = missing > 0 ? Math.ceil(missing / f.healAmount) : 0
              return (
                <li key={f.id} className={`ware ${tooLow ? 'locked' : ''}`}>
                  <div className="cell food"><Icon name="food" size={26} /></div>
                  <div className="ware-main">
                    <strong>{f.name}</strong>
                    <span className="muted">Restores {f.healPct}% of your health (+{f.healAmount})</span>
                    {tooLow ? <span className="muted">Needs level {f.minLevel}</span> : needed > 0 && <span className="muted">{needed} to heal fully, {needed * f.price} gold</span>}
                  </div>
                  <button className="btn primary" disabled={tooLow || character.gold < f.price || missing <= 0} onClick={() => eat(f)}>
                    <Icon name="coin" size={16} /> {f.price}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <ul className="shelf">
          {items.map((i) => {
            const tooLow = character.level < i.minLevel
            return (
              <li key={i.id} className={`ware ${tooLow ? 'locked' : ''}`}>
                <ItemCell item={i} />
                <div className="ware-main">
                  <strong className={`q-${qualityOf(i).id}`}>{i.name}</strong>
                  <span className="muted">{SLOT_LABEL[i.slot]} · {bonusText(i)}</span>
                  {tooLow && <span className="muted">Needs level {i.minLevel}</span>}
                </div>
                <button className="btn primary" disabled={tooLow || character.gold < i.price} onClick={() => buy(i)}>
                  <Icon name="coin" size={16} /> {i.price}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
