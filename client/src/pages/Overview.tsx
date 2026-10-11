import { useEffect, useState } from 'react'
import { api, type Character, type InventoryItem, type Slot } from '../api'
import Bar from '../components/Bar'

const SLOTS: Slot[] = ['helmet', 'armor', 'weapon', 'boots']

function bonusText(i: { strength: number; dexterity: number; hp: number }) {
  return (
    [i.strength && `+${i.strength} STR`, i.dexterity && `+${i.dexterity} DEX`, i.hp && `+${i.hp} HP`]
      .filter(Boolean)
      .join(' · ') || 'no bonus'
  )
}

function Stat({ label, value, bonus }: { label: string; value: number; bonus: number }) {
  return (
    <div className="stat">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
      {bonus > 0 && <span className="bonus">(+{bonus} gear)</span>}
    </div>
  )
}

export default function Overview({ character, onCharacter }: { character: Character; onCharacter: (c: Character) => void }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.inventory().then(setItems).catch((e: Error) => setError(e.message))
  }, [])

  async function toggle(item: InventoryItem) {
    setError('')
    try {
      const res = await (item.equipped ? api.unequip(item.id) : api.equip(item.id))
      setItems(res.inventory)
      onCharacter(res.character)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const worn = (slot: Slot) => items.find((i) => i.equipped && i.slot === slot)
  const backpack = items.filter((i) => !i.equipped)
  const c = character

  return (
    <>
      <h2>Overview</h2>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h3>Stats</h3>
        <div className="stats">
          <Stat label="Level" value={c.level} bonus={0} />
          <Stat label="Strength" value={c.strength} bonus={c.bonus.strength} />
          <Stat label="Dexterity" value={c.dexterity} bonus={c.bonus.dexterity} />
          <Stat label="Max HP" value={c.maxHp} bonus={c.bonus.hp} />
          <Stat label="Gold" value={c.gold} bonus={0} />
        </div>
        <Bar label="Health" value={c.hp} max={c.maxHp} color="#b84a4a" />
        <Bar label="XP" value={c.xp} max={c.xpToNext} />
      </section>

      <section className="card">
        <h3>Equipment</h3>
        <div className="slots">
          {SLOTS.map((slot) => {
            const item = worn(slot)
            return (
              <div key={slot} className={`slot ${item ? 'filled' : ''}`}>
                <span className="muted">{slot}</span>
                {item ? (
                  <>
                    <strong>{item.name}</strong>
                    <span className="bonus">{bonusText(item)}</span>
                    <button className="link" onClick={() => toggle(item)}>Unequip</button>
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
        {backpack.length === 0 && <p className="muted">Nothing here yet. Defeat enemies to find gear.</p>}
        {backpack.map((item) => (
          <div key={item.id} className="item">
            <div>
              <strong>{item.name}</strong> <span className="muted">({item.slot})</span>
              <div className="bonus">{bonusText(item)}</div>
            </div>
            <button onClick={() => toggle(item)}>Equip</button>
          </div>
        ))}
      </section>
    </>
  )
}
