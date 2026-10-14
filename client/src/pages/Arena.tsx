import { useCallback, useEffect, useState } from 'react'
import { api, type ArenaOpponent, type BattleResponse, type Character } from '../api'
import BattleStage from '../components/BattleStage'
import Icon from '../components/Icon'
import { useAction } from '../components/Toast'

export default function Arena({ character, onCharacter }: { character: Character; onCharacter: (c: Character) => void }) {
  const [opponents, setOpponents] = useState<ArenaOpponent[] | null>(null)
  const [fight, setFight] = useState<{ result: BattleResponse; opp: ArenaOpponent } | null>(null)
  const act = useAction()

  const load = useCallback(async () => {
    const r = await act(api.arena)
    if (r) setOpponents(r.opponents)
  }, [act])
  useEffect(() => { load() }, [load])

  async function challenge(opp: ArenaOpponent) {
    const result = await act(() => api.arenaFight(opp.id))
    if (result) {
      setFight({ result, opp })
      onCharacter(result.character)
    }
  }

  const wounded = character.hp < Math.ceil(character.maxHp * 0.1)
  const noAp = character.ap < 1

  if (fight) {
    const { result } = fight
    return (
      <>
        <h2>Arena</h2>
        <BattleStage
          result={result}
          youName={character.name}
          onClose={() => { setFight(null); load() }}
          onAgain={noAp || wounded ? undefined : () => { const o = fight.opp; setFight(null); challenge(o) }}
          againLabel="Rematch"
          extra={
            <p className="loot">
              Rating {result.ratingChange! >= 0 ? '+' : ''}{result.ratingChange} (now {result.character.arenaRating})
              {result.goldGain ? `, ${result.goldGain} gold won` : ''}
            </p>
          }
        />
      </>
    )
  }

  return (
    <>
      <h2>Arena</h2>
      <div className="rating-banner">
        <div>
          <span className="muted">Your rating</span>
          <b className="num big">{character.arenaRating}</b>
        </div>
        <p>
          Face other gladiators within five levels of you. A win pays gold and raises your rating; a loss lowers it.
          You pay the attack point and the wounds. Your opponent does not.
        </p>
      </div>

      {wounded && <p className="notice error">You are too wounded to fight.</p>}
      {opponents && opponents.length === 0 && (
        <p className="empty">No gladiators near your level yet. Tell a friend to register.</p>
      )}
      <div className="opponents">
        {opponents?.map((o) => {
          const diff = o.rating - character.arenaRating
          return (
            <article key={o.id} className="opp-card">
              <div className="niche small"><span className="niche-glyph"><Icon name="helmet" size={30} /></span></div>
              <div className="opp-info">
                <h3>{o.username}</h3>
                <span className="muted num">Level {o.level} · rating {o.rating} ({diff >= 0 ? '+' : ''}{diff})</span>
              </div>
              <button className="btn primary" disabled={noAp || wounded} onClick={() => challenge(o)}>Challenge</button>
            </article>
          )
        })}
      </div>
    </>
  )
}
