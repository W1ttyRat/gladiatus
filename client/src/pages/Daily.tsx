import { useEffect, useState } from 'react'
import { api, type Character, type DailyStatus } from '../api'

export default function Daily({ onCharacter }: { onCharacter: (c: Character) => void }) {
  const [status, setStatus] = useState<DailyStatus | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.daily().then(setStatus).catch((e: Error) => setError(e.message))
  }, [])

  async function claim() {
    setError('')
    try {
      const res = await api.claimDaily()
      onCharacter(res.character)
      setMessage(`Day ${res.streak}: you received ${res.gold} gold and ${status?.apBonus ?? 0} attack points!`)
      setStatus(await api.daily())
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (!status) return <p>{error || 'Loading...'}</p>

  return (
    <>
      <h2>Daily Reward</h2>
      <div className="card">
        <p>Current streak: <strong>{status.streak} {status.streak === 1 ? 'day' : 'days'}</strong></p>
        <p className="muted">
          Come back every day to grow the reward. It maxes out at a 7-day streak, but missing a day resets it.
        </p>
        <div className="days">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <div key={d} className={`day ${d <= status.streak ? 'done' : ''}`}>Day {d}</div>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        {message && <p className="win">{message}</p>}
        <div className="row">
          <span className="muted">
            {status.claimedToday ? `Tomorrow: ${status.nextGold} gold` : `Today: ${status.nextGold} gold + ${status.apBonus} attack points`}
          </span>
          <button disabled={status.claimedToday} onClick={claim}>{status.claimedToday ? 'Claimed today' : 'Claim'}</button>
        </div>
      </div>
    </>
  )
}
