import { useEffect, useState } from 'react'
import { api, type Achievement, type Character } from '../api'
import Bar from '../components/Bar'
import Icon from '../components/Icon'
import { useAction, useToast } from '../components/Toast'

export default function Achievements({ onCharacter }: { onCharacter: (c: Character) => void }) {
  const [list, setList] = useState<Achievement[]>([])
  const act = useAction()
  const toast = useToast()

  useEffect(() => {
    act(api.achievements).then((a) => a && setList(a))
  }, [act])

  async function claim(a: Achievement) {
    const res = await act(() => api.claimAchievement(a.key))
    if (res) {
      setList(res.achievements)
      onCharacter(res.character)
      toast(`${a.name}: ${a.rewardGold} gold claimed.`)
    }
  }

  const done = list.filter((a) => a.state === 'claimed').length
  const ready = list.filter((a) => a.state === 'claimable').length
  // claimable first, then in progress, then finished
  const order = { claimable: 0, locked: 1, claimed: 2 } as const
  const sorted = [...list].sort((a, b) => order[a.state] - order[b.state])

  return (
    <>
      <h2>Successes</h2>
      <p className="lede">
        {done} of {list.length} claimed{ready > 0 && `, ${ready} ready to collect`}. Every success pays gold the moment you claim it.
      </p>
      <ul className="badges">
        {sorted.map((a) => (
          <li key={a.key} className={`badge-card ${a.state}`}>
            <div className="seal"><Icon name={a.state === 'claimed' ? 'check' : 'medal'} size={26} /></div>
            <div className="badge-main">
              <strong>{a.name}</strong>
              <span className="muted">{a.description}</span>
              {a.state !== 'claimed' && <Bar quiet label="Progress" value={a.progress} max={a.goal} tone="laurel" />}
            </div>
            <div className="badge-side">
              <span className="num reward"><Icon name="coin" size={15} /> {a.rewardGold}</span>
              {a.state === 'claimable' && <button className="btn primary" onClick={() => claim(a)}>Claim</button>}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
