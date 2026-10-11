import { useCallback, useEffect, useState } from 'react'
import { api, getToken, setToken, type Character } from './api'
import Battles from './pages/Battles'
import Overview from './pages/Overview'
import Quests from './pages/Quests'
import Rankings from './pages/Rankings'
import Shops from './pages/Shops'
import './App.css'

function AuthForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const { token } = await (mode === 'login' ? api.login : api.register)(username, password)
      setToken(token)
      onDone()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form className="card auth" onSubmit={submit}>
      <h1>Gladiatus</h1>
      <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <button type="submit">{mode === 'login' ? 'Log in' : 'Create account'}</button>
      <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}
      </button>
    </form>
  )
}

type Page = 'overview' | 'battles' | 'quests' | 'shops' | 'rankings'
// Add new pages here; they show up in the sidebar top-down in this order.
const NAV: { id: Page; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'battles', label: 'Battles' },
  { id: 'quests', label: 'Quests' },
  { id: 'shops', label: 'Shops' },
  { id: 'rankings', label: 'Rankings' },
]

function Game({ onLogout }: { onLogout: () => void }) {
  const [character, setCharacter] = useState<Character | null>(null)
  const [page, setPage] = useState<Page>('overview')

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

  if (!character) return <p>Loading...</p>

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Gladiatus</h1>
        <div className="wallet">
          <strong className="gold">{character.gold} gold</strong>
          <span className="muted">Level {character.level}</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={n.id === page ? 'active' : ''} onClick={() => setPage(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>
        <button className="link" onClick={() => { setToken(null); onLogout() }}>Log out</button>
      </aside>
      <main className="content">
        {page === 'overview' && <Overview character={character} onCharacter={setCharacter} />}
        {page === 'battles' && <Battles character={character} onCharacter={setCharacter} />}
        {page === 'quests' && <Quests onCharacter={setCharacter} />}
        {page === 'shops' && <Shops character={character} onCharacter={setCharacter} />}
        {page === 'rankings' && <Rankings />}
      </main>
    </div>
  )
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken())
  const logout = useCallback(() => setLoggedIn(false), [])
  return loggedIn ? <Game onLogout={logout} /> : <main className="auth-wrap"><AuthForm onDone={() => setLoggedIn(true)} /></main>
}
