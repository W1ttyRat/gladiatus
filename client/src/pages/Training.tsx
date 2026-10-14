import { useEffect, useState } from 'react'
import { api, STAT_INFO, STAT_KEYS, type Character, type StatKey } from '../api'
import Icon from '../components/Icon'
import { useAction, useToast } from '../components/Toast'

export default function Training({ character, onCharacter }: { character: Character; onCharacter: (c: Character) => void }) {
  const [costs, setCosts] = useState<Record<StatKey, number> | null>(null)
  const act = useAction()
  const toast = useToast()

  useEffect(() => {
    act(api.training).then((r) => r && setCosts(r.costs))
  }, [act])

  async function train(stat: StatKey) {
    const res = await act(() => api.train(stat))
    if (res) {
      onCharacter(res.character)
      setCosts(res.costs)
      toast(`${STAT_INFO[stat].label} is now ${res.character.stats[stat].base}.`)
    }
  }

  return (
    <>
      <h2>Training</h2>
      <p className="lede">
        The ludus trainers sell permanent improvements for gold. Each point costs more than the last, so spread your coin around.
      </p>
      <ul className="shelf">
        {costs &&
          STAT_KEYS.map((k) => (
            <li key={k} className="ware">
              <div className="cell"><span className="num big-num">{character.stats[k].base}</span></div>
              <div className="ware-main">
                <strong>{STAT_INFO[k].label}</strong>
                <span className="muted">{STAT_INFO[k].help}</span>
              </div>
              <button className="btn primary" disabled={character.gold < costs[k]} onClick={() => train(k)}>
                <Icon name="coin" size={16} /> {costs[k]}
              </button>
            </li>
          ))}
      </ul>
    </>
  )
}
