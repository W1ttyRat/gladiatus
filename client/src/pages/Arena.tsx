import { useCallback, useEffect, useState } from 'react'
import { api, type ArenaOpponent, type BattleResponse, type Character } from '../api'
import Bar from '../components/Bar'
import BattleLog from '../components/BattleLog'

export default function Arena({ character, onCharacter }: { character: Character; onCharacter: (c: Character) => void }) {
  const [opponents, setOpponents] = useState<ArenaOpponent[]>([])
  const [battle, setBattle] = useState<BattleResponse | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setOpponents((await api.arena()).opponents)
  }, [])

  useEffect(() => {
    load().catch((e: Error) => setError(e.message))
  }, [load])

  async function fight(o: ArenaOpponent) {
    setError('')
    try {
      const res = await api.arenaFight(o.id)
      setBattle(res)
      onCharacter(res.character)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const wounded = character.hp < Math.ceil(character.maxHp * 0.1)

  return (
    <>
      <h2>Arena</h2>
      <p className="muted">
        Fight other gladiators within 5 levels of you. Winning pays gold and raises your rating, which is
        <strong> {character.arenaRating}</strong> right now. Fights cost 1 attack point and your health, just like monsters.
      </p>
      <div className="card">
        <Bar label="Attack points" value={character.ap} max={character.maxAp} />
        <Bar label="Health" value={character.hp} max={character.maxHp} color="#b84a4a" />
      </div>
      {error && <p className="error">{error}</p>}
      {battle ? (
        <BattleLog result={battle} onClose={() => { setBattle(null); load() }} />
      ) : (
        <>
          {opponents.length === 0 && <p className="muted">Nobody to fight yet. Invite a friend to register!</p>}
          {opponents.map((o) => (
            <div key={o.id} className="card enemy">
              <div>
                <strong>{o.username}</strong>
                <div className="muted">Level {o.level} · rating {o.rating}</div>
              </div>
              <button disabled={character.ap < 1 || wounded} onClick={() => fight(o)}>Challenge (1 AP)</button>
            </div>
          ))}
        </>
      )}
    </>
  )
}
