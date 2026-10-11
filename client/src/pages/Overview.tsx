import { useEffect, useState } from 'react'
import { api, STAT_INFO, STAT_KEYS, type Character, type InventoryItem, type Slot } from '../api'
import Bar from '../components/Bar'
import { bonusText } from '../components/ItemInfo'

// two rings can be worn, so the ring slot appears twice
const SLOTS: { slot: Slot; index: number }[] = [
  { slot: 'helmet', index: 0 },
  { slot: 'amulet', index: 0 },
  { slot: 'weapon', index: 0 },
  { slot: 'armor', index: 0 },
  { slot: 'ring', index: 0 },
  { slot: 'ring', index: 1 },
  { slot: 'boots', index: 0 },
]
const pct = (v: number) => `${(v * 100).toFixed(1)}%`

export default function Overview({ character, onCharacter }: { character: Character; onCharacter: (c: Character) => void }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [error, setError] = useState('')
  const c = character

  useEffect(() => {
    api.inventory().then(setItems).catch((e: Error) => setError(e.message))
  }, [])

  async function run(action: () => Promise<{ character: Character; inventory: InventoryItem[] }>) {
    setError('')
    try {
      const res = await action()
      setItems(res.inventory)
      onCharacter(res.character)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function allocate(stat: (typeof STAT_KEYS)[number]) {
    setError('')
    try {
      onCharacter(await api.allocate(stat))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const worn = (slot: Slot, index: number) => items.filter((i) => i.equipped && i.slot === slot)[index]
  const backpack = items.filter((i) => !i.equipped)

  return (
    <>
      <h2>Overview</h2>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h3>Character · Level {c.level}</h3>
        <Bar label="Health" value={c.hp} max={c.maxHp} color="#b84a4a" />
        <Bar label="XP" value={c.xp} max={c.xpToNext} />
        <p className="muted">Regenerating {c.derived.regenPerMinute} HP per minute</p>
      </section>

      <section className="card">
        <h3>Stats {c.statPoints > 0 && <span className="boss">{c.statPoints} points to spend</span>}</h3>
        {STAT_KEYS.map((k) => (
          <div key={k} className="statrow">
            <div>
              <strong>{STAT_INFO[k].label}</strong> <span className="muted">{STAT_INFO[k].help}</span>
            </div>
            <div className="statval">
              <strong>{c.stats[k].total}</strong>
              {c.stats[k].bonus > 0 && <span className="bonus"> (+{c.stats[k].bonus})</span>}
              <button disabled={c.statPoints < 1} onClick={() => allocate(k)} title="Spend a stat point">+</button>
            </div>
          </div>
        ))}
        <div className="derived muted">
          Double attack {pct(c.derived.doubleAttackChance)} · Crit {pct(c.derived.critChance)} · Block {pct(c.derived.blockChance)} ·
          Damage reduction {pct(c.derived.damageReduction)} · Gold +{pct(c.derived.goldBonus)} · XP +{pct(c.derived.xpBonus)} ·
          Shop discount {pct(c.derived.shopDiscount)}
        </div>
      </section>

      <section className="card">
        <h3>Equipment</h3>
        <div className="slots">
          {SLOTS.map(({ slot, index }) => {
            const item = worn(slot, index)
            return (
              <div key={`${slot}${index}`} className={`slot ${item ? 'filled' : ''}`}>
                <span className="muted">{slot}</span>
                {item ? (
                  <>
                    <strong>{item.name}</strong>
                    <span className="bonus">{bonusText(item)}</span>
                    <button className="link" onClick={() => run(() => api.unequip(item.id))}>Unequip</button>
                  </>
                ) : (
                  <em className="muted">empty</em>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="card">
        <h3>Inventory</h3>
        {backpack.length === 0 && <p className="muted">Nothing here yet. Win fights or visit the shops.</p>}
        {backpack.map((item) => (
          <div key={item.id} className="item">
            <div>
              <strong>{item.name}</strong> <span className="muted">({item.slot})</span>
              <div className="bonus">{bonusText(item)}</div>
            </div>
            <div className="actions">
              <button onClick={() => run(() => api.equip(item.id))}>Equip</button>
              <button className="secondary" onClick={() => run(() => api.sell(item.id))}>Sell {item.sellPrice}g</button>
            </div>
          </div>
        ))}
      </section>
    </>
  )
}
