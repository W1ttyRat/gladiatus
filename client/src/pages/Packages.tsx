import { useCallback, useEffect, useState } from 'react'
import { api, type Character, type InventoryItem, type PackageItem } from '../api'
import Bar from '../components/Bar'
import { bonusText } from '../components/ItemInfo'

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
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState(false)
  const [now, setNow] = useState(() => Date.now())

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
    api.packages().then(apply).catch((e: Error) => setError(e.message))
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [apply])

  async function claim(id: number) {
    setError('')
    setMessage('')
    try {
      const name = packages.find((p) => p.id === id)?.name
      apply(await api.claimPackage(id))
      setMessage(`${name} was added to your inventory.`)
    } catch (e) {
      setError((e as Error).message)
      api.packages().then(apply).catch(() => {}) // the package may have expired; resync the lists
    }
  }

  const full = backpack.length >= capacity

  return (
    <>
      <h2>Packages</h2>
      <p className="muted">
        Loot from fights and quests arrives here. Drag a package onto your inventory to keep it (or press Take).
        Unclaimed packages disappear after 7 days.
      </p>
      {error && <p className="error">{error}</p>}
      {message && <p className="win">{message}</p>}

      <div className="pkg-layout">
        <section>
          <h3>Packages ({packages.length})</h3>
          {packages.length === 0 && <p className="muted">No packages. Win some fights!</p>}
          {packages.map((p) => {
            const left = timeLeft(p.expiresAt, now)
            return (
              <div
                key={p.id}
                className={`pkg ${dragging === p.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', String(p.id))
                  e.dataTransfer.effectAllowed = 'move'
                  setDragging(p.id)
                }}
                onDragEnd={() => {
                  setDragging(null)
                  setOver(false)
                }}
              >
                <span className="pkg-icon" aria-hidden>📦</span>
                <div className="pkg-body">
                  <strong>{p.name}</strong> <span className="muted">({p.slot})</span>
                  <div className="bonus">{bonusText(p)}</div>
                  <div className="muted">
                    From {p.source} · <span className={left.soon ? 'expiry-soon' : ''}>{left.text}</span>
                  </div>
                </div>
                <button disabled={full} onClick={() => claim(p.id)}>Take</button>
              </div>
            )
          })}
        </section>

        <section>
          <h3>Inventory</h3>
          <Bar label="Space" value={backpack.length} max={capacity} color={full ? '#b84a4a' : undefined} />
          <div
            className={`dropzone ${over ? 'over' : ''} ${full ? 'full' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              const id = Number(e.dataTransfer.getData('text/plain'))
              setDragging(null)
              if (Number.isInteger(id) && id > 0) claim(id)
            }}
          >
            {full && <p className="error">Inventory full. Sell items on the Overview page to make room.</p>}
            {backpack.length === 0 && !full && <p className="muted">Drop packages here.</p>}
            {backpack.map((i) => (
              <div key={i.id} className="item">
                <div>
                  <strong>{i.name}</strong> <span className="muted">({i.slot})</span>
                  <div className="bonus">{bonusText(i)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
