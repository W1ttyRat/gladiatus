import { useEffect, useState } from 'react'
import type { BattleResponse } from '../api'

export default function BattleLog({ result, onClose }: { result: BattleResponse; onClose: () => void }) {
  const [shown, setShown] = useState(0)
  const done = shown >= result.log.length

  useEffect(() => {
    if (done) return
    const t = setTimeout(() => setShown((n) => n + 1), 250)
    return () => clearTimeout(t)
  }, [shown, done])

  const verdict = result.won ? 'Victory!' : result.draw ? 'Draw' : 'Defeat'
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
            <strong className={result.won ? 'win' : 'lose'}>
              {verdict} ({result.playerDamage} vs {result.enemyDamage} damage)
              {result.drops.length > 0 && ` · found ${result.drops.map((d) => d.name).join(', ')}`}
            </strong>
            <button onClick={onClose}>Continue</button>
          </>
        )}
      </div>
    </div>
  )
}
