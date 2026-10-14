import { useCallback, useEffect, useState } from 'react'
import { api, getToken, setToken, type Character } from './api'
import Bar from './components/Bar'
import Icon, { type IconName } from './components/Icon'
import { TipProvider } from './components/Tip'
import { ToastProvider } from './components/Toast'
import Achievements from './pages/Achievements'
import Arena from './pages/Arena'
import Auction from './pages/Auction'
import Auth from './pages/Auth'
import Battles from './pages/Battles'
import Daily from './pages/Daily'
import Overview from './pages/Overview'
import Packages from './pages/Packages'
import Quests from './pages/Quests'
import Rankings from './pages/Rankings'
import Reports from './pages/Reports'
import Shops from './pages/Shops'
import Training from './pages/Training'
import './App.css'

type Page =
  | 'overview' | 'training' | 'packages'
  | 'battles' | 'arena'
  | 'shops' | 'auction' | 'quests'
  | 'reports' | 'achievements' | 'rankings' | 'daily'

// Add new pages here: they show up in the sidebar group by group, top-down in this order.
const NAV: { group: string; pages: { id: Page; label: string; icon: IconName }[] }[] = [
  {
    group: 'Gladiator',
    pages: [
      { id: 'overview', label: 'Overview', icon: 'hero' },
      { id: 'training', label: 'Training', icon: 'train' },
      { id: 'packages', label: 'Packages', icon: 'box' },
    ],
  },
  {
    group: 'Combat',
    pages: [
      { id: 'battles', label: 'Expeditions', icon: 'map' },
      { id: 'arena', label: 'Arena', icon: 'arena' },
    ],
  },
  {
    group: 'Town',
    pages: [
      { id: 'shops', label: 'Merchants', icon: 'market' },
      { id: 'auction', label: 'Auction house', icon: 'gavel' },
      { id: 'quests', label: 'Quests', icon: 'scroll' },
    ],
  },
  {
    group: 'Glory',
    pages: [
      { id: 'reports', label: 'Reports', icon: 'report' },
      { id: 'achievements', label: 'Successes', icon: 'medal' },
      { id: 'rankings', label: 'Pantheon', icon: 'trophy' },
      { id: 'daily', label: 'Daily reward', icon: 'sun' },
    ],
  },
]
const ALL_PAGES = NAV.flatMap((g) => g.pages)

const pageFromHash = (): Page => {
  const id = window.location.hash.slice(1)
  return ALL_PAGES.some((p) => p.id === id) ? (id as Page) : 'overview'
}

function Topbar({ c, onLogout }: { c: Character; onLogout: () => void }) {
  return (
    <header className="topbar">
      <div className="brand">Gladiatus</div>
      <div className="resources">
        <div className="res gold" title="Gold">
          <Icon name="coin" size={18} />
          <b className="num">{c.gold.toLocaleString()}</b>
        </div>
        <div className="res ap" title={`Attack points: ${c.ap} of ${c.maxAp}. One regenerates every 5 minutes.`}>
          <Icon name="bolt" size={18} />
          <div className="pips" aria-label={`${c.ap} of ${c.maxAp} attack points`}>
            {Array.from({ length: c.maxAp }, (_, i) => (
              <i key={i} className={i < c.ap ? 'on' : ''} />
            ))}
          </div>
        </div>
        <div className="res hp" title="Health">
          <Icon name="heart" size={18} />
          <Bar label="Health" value={c.hp} max={c.maxHp} tone="blood" />
        </div>
      </div>
      <div className="who">
        <span className="who-name">{c.name}</span>
        <span className="muted num">Level {c.level}</span>
        <button className="icon-btn" onClick={onLogout} aria-label="Log out" title="Log out">
          <Icon name="logout" size={18} />
        </button>
      </div>
      <div className="xpline" title={`${c.xp} of ${c.xpToNext} XP`}>
        <i style={{ width: `${Math.min(100, (c.xp / c.xpToNext) * 100)}%` }} />
      </div>
    </header>
  )
}

function Game({ onLogout }: { onLogout: () => void }) {
  const [character, setCharacter] = useState<Character | null>(null)
  const [page, setPage] = useState<Page>(pageFromHash)

  useEffect(() => {
    api.me().then(setCharacter).catch(() => {
      setToken(null)
      onLogout()
    })
  }, [onLogout])

  // health and attack points regenerate on the server; refresh now and then so the bars move
  useEffect(() => {
    const t = setInterval(() => api.me().then(setCharacter).catch(() => {}), 20000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (p: Page) => {
    window.location.hash = p
    window.scrollTo({ top: 0 })
  }

  if (!character) return <p className="loading">Gathering the crowd...</p>
  const c = character
  const logout = () => { setToken(null); onLogout() }

  return (
    <div className="shell">
      <Topbar c={c} onLogout={logout} />
      <div className="meander" aria-hidden="true" />
      <div className="body">
        <nav className="side" aria-label="Main">
          {NAV.map((g) => (
            <div key={g.group} className="nav-group">
              <span className="nav-title">{g.group}</span>
              {g.pages.map((p) => (
                <button key={p.id} className={`nav-item ${p.id === page ? 'active' : ''}`} onClick={() => go(p.id)} aria-current={p.id === page ? 'page' : undefined}>
                  <Icon name={p.icon} size={19} />
                  <span>{p.label}</span>
                  {p.id === 'packages' && c.packageCount > 0 && <span className="badge">{c.packageCount}</span>}
                  {p.id === 'overview' && c.statPoints > 0 && <span className="badge">{c.statPoints}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <main className="content">
          {page === 'overview' && <Overview character={c} onCharacter={setCharacter} />}
          {page === 'training' && <Training character={c} onCharacter={setCharacter} />}
          {page === 'packages' && <Packages onCharacter={setCharacter} />}
          {page === 'battles' && <Battles character={c} onCharacter={setCharacter} />}
          {page === 'arena' && <Arena character={c} onCharacter={setCharacter} />}
          {page === 'shops' && <Shops character={c} onCharacter={setCharacter} />}
          {page === 'auction' && <Auction character={c} onCharacter={setCharacter} />}
          {page === 'quests' && <Quests onCharacter={setCharacter} />}
          {page === 'reports' && <Reports />}
          {page === 'achievements' && <Achievements onCharacter={setCharacter} />}
          {page === 'rankings' && <Rankings me={c.name} />}
          {page === 'daily' && <Daily onCharacter={setCharacter} />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken())
  const logout = useCallback(() => setLoggedIn(false), [])
  return (
    <ToastProvider>
      <TipProvider>{loggedIn ? <Game onLogout={logout} /> : <Auth onDone={() => setLoggedIn(true)} />}</TipProvider>
    </ToastProvider>
  )
}
