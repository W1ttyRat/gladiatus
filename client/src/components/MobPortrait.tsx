import { useState } from 'react'
import { STAT_INFO, STAT_KEYS, type Enemy, type StatView } from '../api'

function StatValue({ view }: { view: StatView }) {
  if (view.kind === 'hidden') return <span className="muted">???</span>
  if (view.kind === 'rating') return <span className={`tone-${view.tone}`}>{view.label}</span>
  return <strong>{view.value}</strong>
}

/** Mob picture; hovering (or focusing) it shows what the player has learned about the mob's stats. */
export default function MobPortrait({ enemy }: { enemy: Enemy }) {
  const [broken, setBroken] = useState(false)
  const allKnown = STAT_KEYS.every((k) => enemy.stats[k].kind === 'number')

  return (
    <div className={`portrait ${enemy.isBoss ? 'boss-frame' : ''}`} tabIndex={0}>
      {broken ? (
        <div className="portrait-fallback">{enemy.name[0]}</div>
      ) : (
        <img src={enemy.image} alt={enemy.name} width={72} height={72} onError={() => setBroken(true)} />
      )}
      <div className="tooltip" role="tooltip">
        <div className="tooltip-title">
          <strong>{enemy.name}</strong>
          <span className="muted">Level {enemy.level}</span>
        </div>
        {STAT_KEYS.map((k) => (
          <div key={k} className="tooltip-row">
            <span>{STAT_INFO[k].label}</span>
            <StatValue view={enemy.stats[k]} />
          </div>
        ))}
        <div className="muted tooltip-foot">
          {enemy.attacks === 0
            ? 'You know nothing about this enemy yet. Attack it to learn more.'
            : allKnown
              ? `You know this enemy well (attacked ${enemy.attacks}x).`
              : `Attacked ${enemy.attacks}x. Keep fighting to learn exact numbers.`}
        </div>
      </div>
    </div>
  )
}
