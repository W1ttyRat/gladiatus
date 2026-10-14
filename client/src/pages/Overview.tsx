import { useEffect, useState } from 'react'
import { api, STAT_INFO, STAT_KEYS, type Character, type InventoryItem, type Slot, type StatKey } from '../api'
import Bar from '../components/Bar'
import Icon from '../components/Icon'
import { bonusText, ItemCell, qualityOf, SLOT_LABEL } from '../components/items'
import { useAction, useToast } from '../components/Toast'

// the paperdoll: where each slot sits in the grid; two rings can be worn
const DOLL: { slot: Slot; index: number; area: string }[] = [
  { slot: 'helmet', index: 0, area: 'helmet' },
  { slot: 'amulet', index: 0, area: 'amulet' },
  { slot: 'weapon', index: 0, area: 'weapon' },
  { slot: 'armor', index: 0, area: 'armor' },
  { slot: 'ring', index: 0, area: 'ring1' },
  { slot: 'boots', index: 0, area: 'boots' },
  { slot: 'ring', index: 1, area: 'ring2' },
]
const CAPACITY = 30
const pct = (v: number) => `${(v * 100).toFixed(1)}%`

type Res = { character: Character; inventory: InventoryItem[] }

export default function Overview({ character: c, onCharacter }: { character: Character; onCharacter: (c: Character) => void }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [dragId, setDragId] = useState<number | null>(null)
  const [overSlot, setOverSlot] = useState<string | null>(null)
  const [overPack, setOverPack] = useState(false)
  const act = useAction()
  const toast = useToast()

  useEffect(() => {
    api.inventory().then(setItems).catch((e: Error) => toast(e.message, 'error'))
  }, [toast])

  async function run(fn: () => Promise<Res>) {
    const res = await act(fn)
    if (res) {
      setItems(res.inventory)
      onCharacter(res.character)
    }
    return res
  }

  const equip = (id: number) => run(() => api.equip(id))
  const unequip = (id: number) => run(() => api.unequip(id))
  async function sell(item: InventoryItem) {
    const res = await run(() => api.sell(item.id))
    if (res) {
      setSelected(null)
      toast(`Sold ${item.name} for ${item.sellPrice} gold.`)
    }
  }
  async function allocate(stat: StatKey) {
    const res = await act(() => api.allocate(stat))
    if (res) onCharacter(res)
  }

  const worn = (slot: Slot, index: number) => items.filter((i) => i.equipped && i.slot === slot)[index]
  const backpack = items.filter((i) => !i.equipped)
  const sel = backpack.find((i) => i.id === selected)
  const dragging = items.find((i) => i.id === dragId)

  return (
    <>
      <h2>Overview</h2>
      <div className="two-col">
        <section className="panel">
          <h3>Equipment</h3>
          <div className="doll">
            {DOLL.map(({ slot, index, area }) => {
              const item = worn(slot, index)
              const accepts = dragging && !dragging.equipped && dragging.slot === slot
              return (
                <div
                  key={area}
                  style={{ gridArea: area }}
                  className={`slot ${item ? 'filled' : ''} ${accepts ? 'accepts' : ''} ${overSlot === area && accepts ? 'over' : ''}`}
                  onDragOver={(e) => { if (accepts) { e.preventDefault(); setOverSlot(area) } }}
                  onDragLeave={() => setOverSlot(null)}
                  onDrop={(e) => { e.preventDefault(); setOverSlot(null); if (dragging && accepts) equip(dragging.id) }}
                >
                  {item ? (
                    <ItemCell
                      item={item}
                      arch
                      extra="Click to take off"
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(item.id)); setDragId(item.id) }}
                      onDragEnd={() => { setDragId(null); setOverPack(false) }}
                      onClick={() => unequip(item.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') unequip(item.id) }}
                    />
                  ) : (
                    <div className="cell arch empty" aria-label={`Empty ${slot} slot`}>
                      <Icon name={slot} size={30} />
                    </div>
                  )}
                  <span className="slot-name">{SLOT_LABEL[slot]}</span>
                </div>
              )
            })}
          </div>
          <div className="vitals">
            <Bar label="Health" value={c.hp} max={c.maxHp} tone="blood" hint={`+${c.derived.regenPerMinute}/min`} />
            <Bar label="Experience" value={c.xp} max={c.xpToNext} tone="laurel" />
          </div>
        </section>

        <section className="panel">
          <h3>
            Attributes
            {c.statPoints > 0 && <span className="pill">{c.statPoints} to spend</span>}
          </h3>
          <ul className="stat-list">
            {STAT_KEYS.map((k) => (
              <li key={k}>
                <div>
                  <strong>{STAT_INFO[k].label}</strong>
                  <span className="muted">{STAT_INFO[k].help}</span>
                </div>
                <div className="stat-val">
                  <b className="num">{c.stats[k].total}</b>
                  {c.stats[k].bonus > 0 && <span className="bonus num">+{c.stats[k].bonus} gear</span>}
                  <button className="icon-btn solid" disabled={c.statPoints < 1} onClick={() => allocate(k)} aria-label={`Add a point to ${STAT_INFO[k].label}`}>
                    <Icon name="plus" size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <dl className="derived">
            <div><dt>Double attack</dt><dd className="num">{pct(c.derived.doubleAttackChance)}</dd></div>
            <div><dt>Critical hit</dt><dd className="num">{pct(c.derived.critChance)}</dd></div>
            <div><dt>Block</dt><dd className="num">{pct(c.derived.blockChance)}</dd></div>
            <div><dt>Damage reduction</dt><dd className="num">{pct(c.derived.damageReduction)}</dd></div>
            <div><dt>Gold from fights</dt><dd className="num">+{pct(c.derived.goldBonus)}</dd></div>
            <div><dt>XP from fights</dt><dd className="num">+{pct(c.derived.xpBonus)}</dd></div>
            <div><dt>Shop discount</dt><dd className="num">{pct(c.derived.shopDiscount)}</dd></div>
            <div><dt>Arena rating</dt><dd className="num">{c.arenaRating}</dd></div>
          </dl>
        </section>
      </div>

      <section
        className={`panel ${overPack ? 'drop-over' : ''}`}
        onDragOver={(e) => { if (dragging?.equipped) { e.preventDefault(); setOverPack(true) } }}
        onDragLeave={() => setOverPack(false)}
        onDrop={(e) => { e.preventDefault(); setOverPack(false); if (dragging?.equipped) unequip(dragging.id) }}
      >
        <h3>
          Backpack <span className="muted num">{backpack.length}/{CAPACITY}</span>
        </h3>
        <div className="grid-pack">
          {Array.from({ length: CAPACITY }, (_, n) => {
            const item = backpack[n]
            return item ? (
              <ItemCell
                key={item.id}
                item={item}
                selected={item.id === selected}
                extra={`Sells for ${item.sellPrice} gold. Drag to a slot to wear.`}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(item.id)); setDragId(item.id) }}
                onDragEnd={() => { setDragId(null); setOverSlot(null) }}
                onClick={() => setSelected(item.id === selected ? null : item.id)}
                onDoubleClick={() => equip(item.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelected(item.id === selected ? null : item.id) }}
              />
            ) : (
              <div key={`e${n}`} className="cell empty" />
            )
          })}
        </div>
        {sel ? (
          <div className="pack-actions">
            <div>
              <strong className={`q-${qualityOf(sel).id}`}>{sel.name}</strong>
              <span className="muted"> {SLOT_LABEL[sel.slot]} · {bonusText(sel)}</span>
            </div>
            <div className="btn-row">
              <button className="btn primary" onClick={() => equip(sel.id)}>Wear</button>
              <button className="btn" onClick={() => sell(sel)}>Sell for {sel.sellPrice}</button>
            </div>
          </div>
        ) : (
          <p className="hint">
            {backpack.length === 0
              ? 'Your backpack is empty. Win fights to earn loot, or visit the merchants.'
              : 'Select an item to wear or sell it. You can also drag it onto a slot, or double-click to wear it.'}
          </p>
        )}
      </section>
    </>
  )
}
