import { useEffect, useState } from 'react'
import { api, type Character, type Quest } from '../api'
import Bar from '../components/Bar'

export default function Quests({ onCharacter }: { onCharacter: (c: Character) => void }) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.quests().then(setQuests).catch((e: Error) => setError(e.message))
  }, [])

  async function accept(q: Quest) {
    setError('')
    try {
      setQuests((await api.acceptQuest(q.id)).quests)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function claim(q: Quest) {
    setError('')
    try {
      const res = await api.claimQuest(q.id)
      setQuests(res.quests)
      onCharacter(res.character)
      setMessage(`Quest rewards claimed: ${q.rewardGold} gold, ${q.rewardXp} XP${q.rewardItem ? `, ${q.rewardItem}` : ''}.${res.levelsGained ? ' Level up!' : ''}`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const group = (statuses: Quest['status'][]) => quests.filter((q) => statuses.includes(q.status))
  const available = group(['available'])

  const card = (q: Quest) => (
    <div key={q.id} className={`card ${q.locked ? 'locked' : ''}`}>
      <div className="row" style={{ marginTop: 0 }}>
        <strong>{q.name}</strong>
        <span className="muted">Level {q.minLevel}+</span>
      </div>
      <p className="muted">{q.description}</p>
      <div className="bonus">
        Reward: {q.rewardGold} gold · {q.rewardXp} XP{q.rewardItem && ` · ${q.rewardItem}`}
      </div>
      {(q.status === 'active' || q.status === 'completed') && <Bar label="Progress" value={q.progress} max={q.targetCount} />}
      <div className="row">
        <span className="muted">{q.status === 'claimed' ? 'Completed' : `Goal: ${q.targetCount}x ${q.targetEnemy ?? (q.type === 'defeat_boss' ? 'boss victories' : 'victories')}`}</span>
        {q.status === 'available' && <button disabled={q.locked} onClick={() => accept(q)}>{q.locked ? 'Locked' : 'Accept'}</button>}
        {q.status === 'completed' && <button onClick={() => claim(q)}>Claim reward</button>}
      </div>
    </div>
  )

  return (
    <>
      <h2>Quests</h2>
      {error && <p className="error">{error}</p>}
      {message && <p className="win">{message}</p>}
      <h3>Active</h3>
      {group(['active', 'completed']).map(card)}
      {group(['active', 'completed']).length === 0 && <p className="muted">No active quests. Accept one below.</p>}
      <h3>Available</h3>
      {available.map(card)}
      {group(['claimed']).length > 0 && <h3>Completed</h3>}
      {group(['claimed']).map(card)}
    </>
  )
}
