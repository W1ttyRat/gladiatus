import { useEffect, useState } from 'react'
import { api, STAT_INFO, STAT_KEYS, type Character, type StatKey } from '../api'

export default function Training({ character, onCharacter }: { character: Character; onCharacter: (c: Character) => void }) {
  const [costs, setCosts] = useState<Record<StatKey, number> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.training().then((r) => setCosts(r.costs)).catch((e: Error) => setError(e.message))
  }, [])

  async function train(stat: StatKey) {
    setError('')
    try {
      const res = await api.train(stat)
      onCharacter(res.character)
      setCosts(res.costs)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      <h2>Training</h2>
      <p className="muted">
        Pay gold to permanently raise a stat by one point. The more trained a stat is, the more it costs.
        You have <strong className="gold">{character.gold} gold</strong>.
      </p>
      {error && <p className="error">{error}</p>}
      {costs &&
        STAT_KEYS.map((k) => (
          <div key={k} className="card enemy">
            <div>
              <strong>{STAT_INFO[k].label}</strong> <span className="muted">currently {character.stats[k].base}</span>
              <div className="muted">{STAT_INFO[k].help}</div>
            </div>
            <button disabled={character.gold < costs[k]} onClick={() => train(k)}>Train {costs[k]}g</button>
          </div>
        ))}
    </>
  )
}
