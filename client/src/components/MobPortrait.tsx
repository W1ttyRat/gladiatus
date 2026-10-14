import { useState } from 'react'
import { STAT_INFO, STAT_KEYS, type Enemy, type StatView } from '../api'
import { useTip } from './Tip'

function StatValue({ view }: { view: StatView }) {
  if (view.kind === 'hidden') return <span className="muted">unknown</span>
  if (view.kind === 'rating') return <span className={`tone-${view.tone}`}>{view.label}</span>
  return <b>{view.value}</b>
}

function Knowledge({ enemy }: { enemy: Enemy }) {
  const allKnown = STAT_KEYS.every((k) => enemy.stats[k].kind === 'number')
  return (
    <div className="item-tip">
      <strong>{enemy.name}</strong>
      <span className="muted">Level {enemy.level}{enemy.isBoss ? ' boss' : ''}</span>
      <ul>
        {STAT_KEYS.map((k) => (
          <li key={k}>
            <span>{STAT_INFO[k].label}</span>
            <StatValue view={enemy.stats[k]} />
          </li>
        ))}
      </ul>
      <span className="muted">
        {enemy.attacks === 0
          ? 'You know nothing about this enemy yet. Fight it to learn more.'
          : allKnown
            ? `You know this enemy well (fought ${enemy.attacks} times).`
            : `Fought ${enemy.attacks} times. Keep fighting to learn exact numbers.`}
      </span>
    </div>
  )
}

/** Mob picture in an arched niche; hovering or focusing it shows what the player has learned. */
export default function MobPortrait({ enemy, size = 96 }: { enemy: Enemy; size?: number }) {
  const [broken, setBroken] = useState(false)
  const tip = useTip(<Knowledge enemy={enemy} />)
  return (
    <div {...tip} className={`niche portrait ${enemy.isBoss ? 'boss' : ''} ${enemy.unlocked ? '' : 'locked'}`} tabIndex={0} aria-label={`${enemy.name}, level ${enemy.level}`}>
      {broken ? (
        <span className="niche-glyph">{enemy.name[0]}</span>
      ) : (
        <img src={enemy.image} alt="" width={size} height={size} onError={() => setBroken(true)} />
      )}
    </div>
  )
}
