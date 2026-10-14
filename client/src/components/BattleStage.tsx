import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { BattleResponse, Round } from '../api'
import Icon from './Icon'

interface Segment {
  intro: string[]
  rounds: string[][]
  epilogue: string[]
}

/** Splits the server's text log into the intro, ten rounds and the closing lines. */
export function splitLog(log: string[]): Segment {
  const seg: Segment = { intro: [], rounds: [], epilogue: [] }
  let inEpilogue = false
  for (const line of log) {
    if (/^-- Round \d+ --$/.test(line)) {
      seg.rounds.push([])
    } else if (line.startsWith('Total damage:')) {
      inEpilogue = true
      seg.epilogue.push(line)
    } else if (inEpilogue) {
      seg.epilogue.push(line)
    } else if (seg.rounds.length) {
      seg.rounds[seg.rounds.length - 1].push(line)
    } else {
      seg.intro.push(line)
    }
  }
  return seg
}

const ROUND_MS = 850

/** Static ten-round summary, reused by the battle reports page. */
export function RoundBars({ rounds }: { rounds: Round[] }) {
  const peak = Math.max(1, ...rounds.map((r) => Math.max(r.player, r.enemy)))
  return (
    <div className="roundbars" aria-label="Damage per round">
      {rounds.map((r, i) => (
        <div key={i} className="roundbar" title={`Round ${i + 1}: you ${r.player}, them ${r.enemy}`}>
          <i className="you" style={{ height: `${(r.player / peak) * 100}%` }} />
          <i className="foe" style={{ height: `${(r.enemy / peak) * 100}%` }} />
          <small>{i + 1}</small>
        </div>
      ))}
    </div>
  )
}

function Fighter({ name, side, image, total, scale, hit }: { name: string; side: 'you' | 'foe'; image?: string; total: number; scale: number; hit: number | null }) {
  const [broken, setBroken] = useState(false)
  return (
    <div className={`fighter ${side}`}>
      <div className="niche">
        {side === 'foe' && image && !broken ? (
          <img src={image} alt="" width={96} height={96} onError={() => setBroken(true)} />
        ) : (
          <span className="niche-glyph">{side === 'you' ? <Icon name="helmet" size={46} /> : name[0]}</span>
        )}
        {hit != null && hit > 0 && <b key={`${hit}-${total}`} className="floater">{hit}</b>}
      </div>
      <strong>{name}</strong>
      <div className="tally" aria-label={`${name} has dealt ${total} damage`}>
        <i style={{ width: `${scale ? (total / scale) * 100 : 0}%` }} />
      </div>
      <span className="num tally-num">{total}</span>
    </div>
  )
}

/** Plays a finished fight round by round: two niches, growing damage tallies and the log. */
export default function BattleStage({
  result,
  youName,
  foeImage,
  onClose,
  onAgain,
  againLabel = 'Fight again',
  extra,
}: {
  result: BattleResponse
  youName: string
  foeImage?: string
  onClose: () => void
  onAgain?: () => void
  againLabel?: string
  extra?: ReactNode
}) {
  const seg = useMemo(() => splitLog(result.log), [result.log])
  const total = result.rounds.length
  const [shown, setShown] = useState(0)
  const done = shown >= total
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (done) return
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 600 : ROUND_MS)
    return () => clearTimeout(t)
  }, [shown, done])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [shown])

  const upto = result.rounds.slice(0, shown)
  const you = upto.reduce((s, r) => s + r.player, 0)
  const foe = upto.reduce((s, r) => s + r.enemy, 0)
  const scale = Math.max(1, result.playerDamage, result.enemyDamage)
  const last = upto[upto.length - 1]

  const lines = [...seg.intro, ...seg.rounds.slice(0, shown).flatMap((l, i) => [`Round ${i + 1}`, ...l]), ...(done ? seg.epilogue : [])]
  const verdict = result.won ? 'Victory' : result.draw ? 'Draw' : 'Defeat'

  return (
    <section className="stage" aria-label="Fight">
      <div className="stage-floor">
        <Fighter name={youName} side="you" total={you} scale={scale} hit={last ? last.player : null} />
        <div className="stage-mid">
          <span className="round-no num">{done ? 'Final' : shown === 0 ? 'Ready' : `Round ${shown}`}</span>
          <span className="muted">of {total}</span>
        </div>
        <Fighter name={result.enemyName} side="foe" image={foeImage} total={foe} scale={scale} hit={last ? last.enemy : null} />
      </div>

      <div className="stage-log" ref={logRef} tabIndex={0}>
        {lines.map((l, i) => (
          <p key={i} className={/^Round \d+$/.test(l) ? 'log-round' : ''}>{l}</p>
        ))}
      </div>

      {done ? (
        <div className={`verdict ${result.won ? 'win' : result.draw ? 'draw' : 'lose'}`}>
          <div>
            <h3>{verdict}</h3>
            <span className="num">{result.playerDamage} damage dealt, {result.enemyDamage} taken</span>
            {result.drops.length > 0 && (
              <p className="loot">Loot sent to Packages: {result.drops.map((d) => d.name).join(', ')}</p>
            )}
            {result.levelsGained > 0 && <p className="loot">Level up. You have new stat points to spend.</p>}
            {extra}
          </div>
          <div className="verdict-actions">
            {onAgain && <button className="btn primary" onClick={onAgain}>{againLabel}</button>}
            <button className="btn" onClick={onClose}>Leave the sand</button>
          </div>
        </div>
      ) : (
        <div className="verdict-actions end">
          <button className="btn ghost" onClick={() => setShown(total)}>Skip to result</button>
        </div>
      )}
    </section>
  )
}
