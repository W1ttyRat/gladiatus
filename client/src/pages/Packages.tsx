import { useCallback, useEffect, useState } from 'react'
import { api, type Character, type InventoryItem, type PackageItem } from '../api'
import Bar from '../components/Bar'
import { bonusText, ItemCell, qualityOf, SLOT_LABEL } from '../components/items'
import { useAction, useToast } from '../components/Toast'

function timeLeft(expiresAt: string, now: number) {
  const ms = new Date(expiresAt).getTime() - now
  if (ms <= 0) return { text: 'expired', soon: true }
  const h = Math.floor(ms / 3_600_000)
  const d = Math.floor(h / 24)
  const text =
    d > 0 ? `${d}d ${h % 24}h left` : h > 0 ? `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m left` : `${Math.max(1, Math.floor(ms / 60_000))}m left`
  return { text, soon: ms < 86_400_000 }
}

export default function Packages({ onCharacter }: { onCharacter: (c: Character) => void }) {
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [backpack, setBackpack] = useState<InventoryItem[]>([])
  const [capacity, setCapacity] = useState(30)
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const act = useAction()
  const toast = useToast()

  const apply = useCallback(
    (o: Awaited<ReturnType<typeof api.packages>>) => {
      setPackages(o.packages)
      setBackpack(o.inventory.filter((i) => !i.equipped))
      setCapacity(o.capacity)
      onCharacter(o.character)
    },
    [onCharacter],
  )

  useEffect(() => {
    api.packages().then(apply).catch((e: Error) => toast(e.message, 'error'))
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [apply, toast])

  async function claim(id: number) {
    const name = packages.find((p) => p.id === id)?.name
    const res = await act(() => api.claimPackage(id))
    if (res) {
      apply(res)
      toast(`${name} is now in your backpack.`)
    } else {
      api.packages().then(apply).catch(() => {}) // the package may have expired; resync the lists
    }
  }

  const full = backpack.length >= capacity

  return (
    <>
      <h2>Packages</h2>
      <p className="lede">
        Loot from fights, quests and the auction house arrives here. Drag a package onto your backpack to keep it, or press Take.
        Packages vanish after seven days.
      </p>

      <div className="two-col">
        <section className="panel">
          <h3>Waiting for you <span className="muted num">{packages.length}</span></h3>
          {packages.length === 0 && <p className="empty">Nothing waiting. Win a fight and the spoils land here.</p>}
          <ul className="rows">
            {packages.map((p) => {
              const left = timeLeft(p.expiresAt, now)
              return (
                <li
                  key={p.id}
                  className={`row-card ${dragging === p.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(p.id)); e.dataTransfer.effectAllowed = 'move'; setDragging(p.id) }}
                  onDragEnd={() => { setDragging(null); setOver(false) }}
                >
                  <ItemCell item={p} />
                  <div className="row-main">
                    <strong className={`q-${qualityOf(p).id}`}>{p.name}</strong>
                    <span className="muted">{SLOT_LABEL[p.slot]} · {bonusText(p)}</span>
                    <span className="muted">
                      From {p.source} · <span className={left.soon ? 'warn' : ''}>{left.text}</span>
                    </span>
                  </div>
                  <button className="btn primary" disabled={full} onClick={() => claim(p.id)}>Take</button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="panel">
          <h3>Backpack</h3>
          <Bar label="Space" value={backpack.length} max={capacity} tone={full ? 'blood' : 'bronze'} />
          <div
            className={`dropzone ${over ? 'over' : ''} ${full ? 'full' : ''}`}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              const id = Number(e.dataTransfer.getData('text/plain'))
              setDragging(null)
              if (Number.isInteger(id) && id > 0) claim(id)
            }}
          >
            {full && <p className="notice error">Backpack full. Sell or wear something on the Overview page first.</p>}
            {backpack.length === 0 && !full && <p className="empty">Drop packages here.</p>}
            <div className="grid-pack">
              {backpack.map((i) => (
                <ItemCell key={i.id} item={i} extra={`Sells for ${i.sellPrice} gold`} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
