import { useEffect, useState } from 'react'
import { api, type RankBy, type RankingRow } from '../api'
import { useAction } from '../components/Toast'

const BOARDS: { id: RankBy; label: string }[] = [
  { id: 'level', label: 'Level' },
  { id: 'arena', label: 'Arena rating' },
  { id: 'defeated', label: 'Enemies beaten' },
  { id: 'gold', label: 'Wealth' },
]

export default function Rankings({ me }: { me: string }) {
  const [by, setBy] = useState<RankBy>('level')
  const [rows, setRows] = useState<RankingRow[]>([])
  const act = useAction()

  useEffect(() => {
    act(() => api.rankings(by)).then((r) => r && setRows(r))
  }, [by, act])

  return (
    <>
      <h2>Pantheon</h2>
      <p className="lede">The fifty gladiators the crowd talks about. Pick a board to see who leads it.</p>
      <nav className="chips" aria-label="Boards">
        {BOARDS.map((b) => (
          <button key={b.id} className={`chip ${b.id === by ? 'on' : ''}`} onClick={() => setBy(b.id)}>{b.label}</button>
        ))}
      </nav>
      <div className="panel flush">
        <table className="ranking">
          <thead>
            <tr><th>Rank</th><th>Gladiator</th><th className="r">Level</th><th className="r">Rating</th><th className="r">Beaten</th><th className="r">Gold</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.username} className={r.username === me ? 'me' : ''}>
                <td className={`rank rank-${i + 1}`}>{i + 1}</td>
                <td>{r.username}{r.username === me && <span className="pill">you</span>}</td>
                <td className="r num">{r.level}</td>
                <td className="r num">{r.arenaRating}</td>
                <td className="r num">{r.enemiesDefeated}</td>
                <td className="r num">{r.gold.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
