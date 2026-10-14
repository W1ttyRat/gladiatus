import { useEffect, useState } from 'react'
import { api, type Character, type Quest } from '../api'
import Bar from '../components/Bar'
import Icon from '../components/Icon'
import { useAction, useToast } from '../components/Toast'

export default function Quests({ onCharacter }: { onCharacter: (c: Character) => void }) {
  const [quests, setQuests] = useState<Quest[]>([])
  const act = useAction()
  const toast = useToast()

  useEffect(() => {
    act(api.quests).then((q) => q && setQuests(q))
  }, [act])

  async function accept(q: Quest) {
    const res = await act(() => api.acceptQuest(q.id))
    if (res) setQuests(res.quests)
  }

  async function claim(q: Quest) {
    const res = await act(() => api.claimQuest(q.id))
    if (res) {
      setQuests(res.quests)
      onCharacter(res.character)
      toast(`${q.name}: ${q.rewardGold} gold, ${q.rewardXp} XP${q.rewardItem ? ` and ${q.rewardItem} (in Packages)` : ''}.${res.levelsGained ? ' You gained a level.' : ''}`)
    }
  }

  const group = (statuses: Quest['status'][]) => quests.filter((q) => statuses.includes(q.status))
  const goal = (q: Quest) => `${q.targetCount}x ${q.targetEnemy ?? (q.type === 'defeat_boss' ? 'boss victories' : 'victories')}`

  const card = (q: Quest) => (
    <li key={q.id} className={`quest ${q.status} ${q.locked ? 'locked' : ''}`}>
      <div className="quest-head">
        <h4>{q.name}</h4>
        <span className="muted">Level {q.minLevel}+</span>
      </div>
      <p>{q.description}</p>
      <p className="muted">Goal: {goal(q)}</p>
      {(q.status === 'active' || q.status === 'completed') && <Bar quiet label="Progress" value={q.progress} max={q.targetCount} tone="laurel" />}
      <div className="quest-foot">
        <span className="reward num">
          <Icon name="coin" size={15} /> {q.rewardGold} · {q.rewardXp} XP{q.rewardItem && ` · ${q.rewardItem}`}
        </span>
        {q.status === 'available' && <button className="btn primary" disabled={q.locked} onClick={() => accept(q)}>{q.locked ? `Level ${q.minLevel}` : 'Accept'}</button>}
        {q.status === 'completed' && <button className="btn primary" onClick={() => claim(q)}>Claim reward</button>}
        {q.status === 'claimed' && <span className="done"><Icon name="check" size={16} /> Done</span>}
      </div>
    </li>
  )

  const active = group(['active', 'completed'])
  const claimed = group(['claimed'])
  return (
    <>
      <h2>Quests</h2>
      <h3 className="sub">In progress</h3>
      {active.length === 0 && <p className="empty">No active quests. Accept one below.</p>}
      <ul className="quests">{active.map(card)}</ul>
      <h3 className="sub">Offered to you</h3>
      <ul className="quests">{group(['available']).map(card)}</ul>
      {claimed.length > 0 && (
        <>
          <h3 className="sub">Finished</h3>
          <ul className="quests">{claimed.map(card)}</ul>
        </>
      )}
    </>
  )
}
