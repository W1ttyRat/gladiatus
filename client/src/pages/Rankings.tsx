import { useEffect, useState } from 'react'
import { api, type RankingRow } from '../api'

export default function Rankings() {
  const [rows, setRows] = useState<RankingRow[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.rankings().then(setRows).catch((e: Error) => setError(e.message))
  }, [])

  return (
    <>
      <h2>Rankings</h2>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <table className="ranking">
          <thead>
            <tr><th>#</th><th>Gladiator</th><th>Level</th><th>Arena</th><th>Gold</th><th>Enemies beaten</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.username}>
                <td>{i + 1}</td><td>{r.username}</td><td>{r.level}</td><td>{r.arenaRating}</td><td>{r.gold}</td><td>{r.enemiesDefeated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
