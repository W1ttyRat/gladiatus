import { useCallback, useEffect, useState } from 'react'
import { api, type AuctionListing, type Character, type InventoryItem, type Slot } from '../api'
import Icon from '../components/Icon'
import { bonusText, ItemCell, qualityOf, SLOT_LABEL } from '../components/items'
import { useAction, useToast } from '../components/Toast'

const SLOTS: Slot[] = ['weapon', 'helmet', 'armor', 'boots', 'ring', 'amulet']
type View = 'browse' | 'sell' | 'mine'

function timeLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'ending'
  const h = Math.floor(ms / 3_600_000)
  return h > 0 ? `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m` : `${Math.max(1, Math.floor(ms / 60_000))}m`
}

function Listing({ l, action }: { l: AuctionListing; action: React.ReactNode }) {
  return (
    <li className="ware">
      <ItemCell item={l} extra={`Needs level ${l.minLevel}`} />
      <div className="ware-main">
        <strong className={`q-${qualityOf(l).id}`}>{l.name}</strong>
        <span className="muted">{SLOT_LABEL[l.slot]} · {bonusText(l)}</span>
        <span className="muted">Seller {l.seller} · {timeLeft(l.expiresAt)} left</span>
      </div>
      {action}
    </li>
  )
}

export default function Auction({ character, onCharacter }: { character: Character; onCharacter: (c: Character) => void }) {
  const [view, setView] = useState<View>('browse')
  const [slot, setSlot] = useState<Slot | undefined>()
  const [sort, setSort] = useState<'price' | 'newest'>('price')
  const [listings, setListings] = useState<AuctionListing[]>([])
  const [mine, setMine] = useState<{ listings: AuctionListing[]; max: number; fee: number }>({ listings: [], max: 10, fee: 0.05 })
  const [pack, setPack] = useState<InventoryItem[]>([])
  const [pick, setPick] = useState<number | null>(null)
  const [price, setPrice] = useState('')
  const act = useAction()
  const toast = useToast()

  const load = useCallback(async () => {
    if (view === 'browse') setListings((await act(() => api.auction(slot, sort))) ?? [])
    if (view === 'mine') setMine((await act(api.myAuctions)) ?? mine)
    if (view === 'sell') {
      setPack(((await act(api.inventory)) ?? []).filter((i) => !i.equipped))
      setMine((await act(api.myAuctions)) ?? mine)
    }
  }, [view, slot, sort, act])
  useEffect(() => { load() }, [load])

  async function buy(l: AuctionListing) {
    const res = await act(() => api.buyListing(l.id))
    if (res) {
      onCharacter(res.character)
      toast(`Bought ${l.name} for ${l.price} gold. Collect it from Packages.`)
    }
    load()
  }
  async function cancel(l: AuctionListing) {
    const res = await act(() => api.cancelListing(l.id))
    if (res) {
      onCharacter(res.character)
      toast(`${l.name} is back in your Packages.`)
    }
    load()
  }
  async function list() {
    const item = pack.find((i) => i.id === pick)
    const p = Math.floor(Number(price))
    if (!item || !(p >= 1)) return toast('Pick an item and enter a price of at least 1 gold.', 'error')
    const res = await act(() => api.listItem(item.id, p))
    if (res) {
      toast(`${item.name} is up for sale at ${p} gold.`)
      setPick(null)
      setPrice('')
    }
    load()
  }

  const p = Math.floor(Number(price)) || 0
  const picked = pack.find((i) => i.id === pick)

  return (
    <>
      <h2>Auction house</h2>
      <p className="lede">
        Sell spare gear to other gladiators for more than the merchants pay. Listings last 48 hours and the house keeps {(mine.fee * 100).toFixed(0)}% of a sale.
        What you buy arrives in your Packages.
      </p>
      <nav className="chips" aria-label="Auction house">
        <button className={`chip ${view === 'browse' ? 'on' : ''}`} onClick={() => setView('browse')}>Browse</button>
        <button className={`chip ${view === 'sell' ? 'on' : ''}`} onClick={() => setView('sell')}>Sell an item</button>
        <button className={`chip ${view === 'mine' ? 'on' : ''}`} onClick={() => setView('mine')}>My listings</button>
      </nav>

      {view === 'browse' && (
        <>
          <div className="filters">
            <button className={`chip small ${!slot ? 'on' : ''}`} onClick={() => setSlot(undefined)}>All</button>
            {SLOTS.map((s) => (
              <button key={s} className={`chip small ${slot === s ? 'on' : ''}`} onClick={() => setSlot(s)}>
                <Icon name={s} size={14} /> {SLOT_LABEL[s]}
              </button>
            ))}
            <label className="sort">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as 'price' | 'newest')}>
                <option value="price">Lowest price</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </div>
          {listings.length === 0 && <p className="empty">Nothing for sale here. Be the first to list something.</p>}
          <ul className="shelf">
            {listings.map((l) => (
              <Listing
                key={l.id}
                l={l}
                action={
                  <button className="btn primary" disabled={character.gold < l.price} onClick={() => buy(l)}>
                    <Icon name="coin" size={16} /> {l.price}
                  </button>
                }
              />
            ))}
          </ul>
        </>
      )}

      {view === 'sell' && (
        <section className="panel">
          <h3>Choose an item <span className="muted num">{mine.listings.length}/{mine.max} listings used</span></h3>
          {pack.length === 0 && <p className="empty">Your backpack has nothing to sell. Equipped items cannot be listed.</p>}
          <div className="grid-pack">
            {pack.map((i) => (
              <ItemCell key={i.id} item={i} selected={i.id === pick} extra={`Merchants pay ${i.sellPrice}`} onClick={() => setPick(i.id)} onKeyDown={(e) => { if (e.key === 'Enter') setPick(i.id) }} />
            ))}
          </div>
          {picked && (
            <div className="sell-form">
              <div>
                <strong className={`q-${qualityOf(picked).id}`}>{picked.name}</strong>
                <span className="muted"> merchants pay {picked.sellPrice}</span>
              </div>
              <label>
                Asking price
                <input type="number" min={1} max={1000000} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Gold" />
              </label>
              <span className="muted num">{p > 0 ? `You receive ${Math.floor(p * (1 - mine.fee))} after the fee` : 'Enter a price'}</span>
              <button className="btn primary" onClick={list}>List for 48 hours</button>
            </div>
          )}
        </section>
      )}

      {view === 'mine' && (
        <>
          {mine.listings.length === 0 && <p className="empty">You have nothing listed. Sell spare gear from the Sell tab.</p>}
          <ul className="shelf">
            {mine.listings.map((l) => (
              <Listing
                key={l.id}
                l={l}
                action={
                  <div className="ware-price">
                    <span className="num"><Icon name="coin" size={16} /> {l.price}</span>
                    <button className="btn" onClick={() => cancel(l)}>Withdraw</button>
                  </div>
                }
              />
            ))}
          </ul>
        </>
      )}
    </>
  )
}
