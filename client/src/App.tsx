import { useCallback, useEffect, useState } from 'react'
import { api, getToken, setToken, type Area, type BattleResponse, type Character } from './api'
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

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="bar">
      <span>{label} {value}/{max}</span>
      <div><i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
    </div>
  )
}

function BattleLog({ result, onClose }: { result: BattleResponse; onClose: () => void }) {
  const [shown, setShown] = useState(0)
  const done = shown >= result.log.length

  useEffect(() => {
    if (done) return
    const t = setTimeout(() => setShown((n) => n + 1), 350)
    return () => clearTimeout(t)
  }, [shown, done])

  return (
    <div className="card battle">
      <div className="log">
        {result.log.slice(0, shown).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <div className="row">
        {!done && <button onClick={() => setShown(result.log.length)}>Skip</button>}
        {done && (
          <>
            <strong className={result.won ? 'win' : 'lose'}>{result.won ? 'Victory!' : 'Defeat'}</strong>
            <button onClick={onClose}>Continue</button>
          </>
        )}
      </div>
    </div>
  )
}

function Game({ onLogout }: { onLogout: () => void }) {
  const [character, setCharacter] = useState<Character | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [areaId, setAreaId] = useState<number | null>(null)
  const [battle, setBattle] = useState<BattleResponse | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([api.me(), api.areas()])
      setCharacter(c)
      setAreas(a)
      setAreaId((id) => id ?? a[0]?.id ?? null)
    } catch {
      setToken(null)
      onLogout()
    }
  }, [onLogout])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function attack(enemyId: number) {
    setError('')
    try {
      setBattle(await api.attack(enemyId))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function closeBattle() {
    setBattle(null)
    await refresh()
  }

  if (!character) return <p>Loading...</p>
  const area = areas.find((a) => a.id === areaId)

  return (
    <div className="game">
      <header className="card">
        <div>
          <strong>Level {character.level}</strong> · {character.gold} gold · STR {character.strength} · DEX {character.dexterity} · HP {character.maxHp}
        </div>
        <Bar label="XP" value={character.xp} max={character.xpToNext} />
        <Bar label="Attack points" value={character.ap} max={character.maxAp} />
        <button className="link" onClick={() => { setToken(null); onLogout() }}>Log out</button>
      </header>

      {battle ? (
        <BattleLog result={battle} onClose={closeBattle} />
      ) : (
        <>
          <nav className="tabs">
            {areas.map((a) => (
              <button key={a.id} className={a.id === areaId ? 'active' : ''} disabled={!a.unlocked} onClick={() => setAreaId(a.id)}>
                {a.name} {!a.unlocked && `(Lv ${a.minLevel})`}
              </button>
            ))}
          </nav>
          {error && <p className="error">{error}</p>}
          {area?.enemies.map((e) => (
            <div key={e.id} className={`card enemy ${e.unlocked ? '' : 'locked'}`}>
              <div>
                <strong>{e.name}</strong> {e.isBoss && <span className="boss">BOSS</span>}
                <div className="muted">Level {e.level} · {e.maxHp} HP {e.defeated && '· defeated'}</div>
              </div>
              <button disabled={!e.unlocked || character.ap < 1} onClick={() => attack(e.id)}>
                {e.unlocked ? 'Attack (1 AP)' : 'Locked'}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken())
  const logout = useCallback(() => setLoggedIn(false), [])
  return (
    <main>
      {loggedIn ? <Game onLogout={logout} /> : <AuthForm onDone={() => setLoggedIn(true)} />}
    </main>
  )
}
