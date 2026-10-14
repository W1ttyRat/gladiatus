import { useCallback, useEffect, useState } from 'react'
import { api, type Area, type BattleResponse, type Character, type Enemy } from '../api'
import BattleStage from '../components/BattleStage'
import Icon from '../components/Icon'
import MobPortrait from '../components/MobPortrait'
import { useAction } from '../components/Toast'

export default function Battles({ character, onCharacter }: { character: Character; onCharacter: (c: Character) => void }) {
  const [areas, setAreas] = useState<Area[]>([])
  const [areaId, setAreaId] = useState<number | null>(null)
  const [fight, setFight] = useState<{ result: BattleResponse; enemy: Enemy } | null>(null)
  const act = useAction()

  const loadAreas = useCallback(async () => {
    const a = await act(api.areas)
    if (a) {
      setAreas(a)
      setAreaId((id) => id ?? a.find((x) => x.unlocked)?.id ?? a[0]?.id ?? null)
    }
  }, [act])

  useEffect(() => { loadAreas() }, [loadAreas])

  async function attack(enemy: Enemy) {
    const result = await act(() => api.attack(enemy.id))
    if (result) {
      setFight({ result, enemy })
      onCharacter(result.character)
    }
  }

  const area = areas.find((a) => a.id === areaId)
  const tooWounded = character.hp < Math.ceil(character.maxHp * 0.1)
  const noAp = character.ap < 1

  if (fight) {
    return (
      <>
        <h2>Expeditions</h2>
        <BattleStage
          result={fight.result}
          youName={character.name}
          foeImage={fight.enemy.image}
          onClose={() => { setFight(null); loadAreas() }}
          onAgain={noAp || tooWounded ? undefined : () => { const e = fight.enemy; setFight(null); attack(e) }}
        />
      </>
    )
  }

  return (
    <>
      <h2>Expeditions</h2>
      <p className="lede">
        Every fight costs one attack point and lasts ten rounds. Whoever deals the most damage wins.
        Beat each enemy once to open the road to the next, and the boss waits at the end.
      </p>

      <nav className="chips" aria-label="Locations">
        {areas.map((a) => (
          <button key={a.id} className={`chip ${a.id === areaId ? 'on' : ''}`} disabled={!a.unlocked} onClick={() => setAreaId(a.id)}>
            {!a.unlocked && <Icon name="lock" size={14} />}
            {a.name}
            {!a.unlocked && <small>level {a.minLevel}</small>}
          </button>
        ))}
      </nav>

      {tooWounded && <p className="notice error">You are too wounded to fight. Rest, or buy food from the merchants.</p>}
      {!tooWounded && noAp && <p className="notice">You are out of attack points. One returns every five minutes.</p>}

      <div className="foes">
        {area?.enemies.map((e) => (
          <article key={e.id} className={`foe-card ${e.isBoss ? 'boss' : ''} ${e.unlocked ? '' : 'locked'}`}>
            <MobPortrait enemy={e} size={e.isBoss ? 120 : 96} />
            <div className="foe-info">
              <h3>{e.name}</h3>
              <span className="muted">
                Level {e.level}
                {e.isBoss && ' · boss'}
                {e.defeated && ' · defeated'}
              </span>
              <span className="muted num">{e.attacks > 0 ? `Fought ${e.attacks}x` : 'Never fought'}</span>
            </div>
            <button className={`btn ${e.isBoss ? 'danger' : 'primary'}`} disabled={!e.unlocked || noAp || tooWounded} onClick={() => attack(e)}>
              {e.unlocked ? 'Fight' : 'Beat the previous enemy first'}
            </button>
          </article>
        ))}
      </div>
      <p className="hint">Hover an enemy to see what you have learned about it. Each fight teaches you more.</p>
    </>
  )
}
