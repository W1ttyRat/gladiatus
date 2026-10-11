import { useCallback, useEffect, useState } from 'react'
import { api, type Area, type BattleResponse, type Character } from '../api'
import Bar from '../components/Bar'
import BattleLog from '../components/BattleLog'

export default function Battles({ character, onCharacter }: { character: Character; onCharacter: (c: Character) => void }) {
  const [areas, setAreas] = useState<Area[]>([])
  const [areaId, setAreaId] = useState<number | null>(null)
  const [battle, setBattle] = useState<BattleResponse | null>(null)
  const [error, setError] = useState('')

  const loadAreas = useCallback(async () => {
    const a = await api.areas()
    setAreas(a)
    setAreaId((id) => id ?? a[0]?.id ?? null)
  }, [])

  useEffect(() => {
    loadAreas().catch((e: Error) => setError(e.message))
  }, [loadAreas])

  async function attack(enemyId: number) {
    setError('')
    try {
      const res = await api.attack(enemyId)
      setBattle(res)
      onCharacter(res.character)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const area = areas.find((a) => a.id === areaId)
  const woundedTooMuch = character.hp < Math.ceil(character.maxHp * 0.1)

  return (
    <>
      <h2>Battles</h2>
      <div className="card">
        <Bar label="Attack points" value={character.ap} max={character.maxAp} />
        <Bar label="Health" value={character.hp} max={character.maxHp} color="#b84a4a" />
      </div>
      {battle ? (
        <BattleLog result={battle} onClose={() => { setBattle(null); loadAreas() }} />
      ) : (
        <>
          <nav className="tabs">
            {areas.map((a) => (
              <button key={a.id} className={a.id === areaId ? 'active' : ''} disabled={!a.unlocked} onClick={() => setAreaId(a.id)}>
                {a.name} {!a.unlocked && `(Lv ${a.minLevel})`}
              </button>
            ))}
          </nav>
          {error && <p className="error">{error}</p>}
          {woundedTooMuch && <p className="error">You are too wounded to fight. Rest until your health recovers.</p>}
          {area?.enemies.map((e) => (
            <div key={e.id} className={`card enemy ${e.unlocked ? '' : 'locked'}`}>
              <div>
                <strong>{e.name}</strong> {e.isBoss && <span className="boss">BOSS</span>}
                <div className="muted">Level {e.level} · STR {e.strength} · DEX {e.dexterity} {e.defeated && '· defeated'}</div>
              </div>
              <button disabled={!e.unlocked || character.ap < 1 || woundedTooMuch} onClick={() => attack(e.id)}>
                {e.unlocked ? 'Attack (1 AP)' : 'Locked'}
              </button>
            </div>
          ))}
        </>
      )}
    </>
  )
}
