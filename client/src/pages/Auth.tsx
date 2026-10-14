import { useState } from 'react'
import { api, setToken } from '../api'
import Icon from '../components/Icon'

export default function Auth({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { token } = await (mode === 'login' ? api.login : api.register)(username, password)
      setToken(token)
      onDone()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const register = mode === 'register'
  return (
    <main className="gate">
      <div className="gate-art" aria-hidden="true">
        <div className="niche huge">
          <span className="niche-glyph"><Icon name="helmet" size={96} strokeWidth={1.2} /></span>
        </div>
      </div>
      <form className="gate-form" onSubmit={submit}>
        <h1>Gladiatus</h1>
        <p className="lede">
          {register
            ? 'Choose a name the crowd will chant. You start with a rusty sword and 20 attack points.'
            : 'The sand is warm and the crowd is waiting. Sign in to continue your career.'}
        </p>
        <label>
          Name
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required minLength={3} maxLength={20} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'} required minLength={6} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn primary wide" disabled={busy}>
          {register ? 'Enter the arena' : 'Sign in'}
        </button>
        <button type="button" className="btn ghost wide" onClick={() => { setMode(register ? 'login' : 'register'); setError('') }}>
          {register ? 'I already have a gladiator' : 'Create a new gladiator'}
        </button>
      </form>
    </main>
  )
}
