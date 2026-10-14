import { useEffect, useState } from 'react'
import { api, type Character, type DailyStatus } from '../api'
import Icon from '../components/Icon'
import { useAction, useToast } from '../components/Toast'

export default function Daily({ onCharacter }: { onCharacter: (c: Character) => void }) {
  const [status, setStatus] = useState<DailyStatus | null>(null)
  const act = useAction()
  const toast = useToast()

  useEffect(() => {
    act(api.daily).then((s) => s && setStatus(s))
  }, [act])

  async function claim() {
    const res = await act(api.claimDaily)
    if (res) {
      onCharacter(res.character)
      toast(`Day ${res.streak}: ${res.gold} gold and ${status?.apBonus ?? 0} attack points.`)
      setStatus(await act(api.daily) ?? null)
    }
  }

  if (!status) return <p className="loading">Reading the tablet...</p>

  // the day that is claimed next (or was claimed today)
  const current = status.claimedToday ? status.streak : status.nextStreak
  return (
    <>
      <h2>Daily reward</h2>
      <p className="lede">
        The emperor's steward pays everyone who returns. Claim once a day to build a streak up to seven days, and miss a day to start over.
      </p>
      <ol className="tablets">
        {status.rewards.map((gold, i) => {
          const day = i + 1
          const state = day < current || (day === current && status.claimedToday) ? 'done' : day === current ? 'now' : 'later'
          return (
            <li key={day} className={`tablet ${state}`}>
              <span className="muted">Day {day}</span>
              {state === 'done' ? <Icon name="check" size={22} /> : <Icon name="coin" size={22} />}
              <b className="num">{gold}</b>
            </li>
          )
        })}
      </ol>
      <div className="daily-foot">
        <p>
          {status.claimedToday
            ? `You collected today's reward. Come back tomorrow for ${status.nextGold} gold.`
            : `Today pays ${status.nextGold} gold and ${status.apBonus} attack points.`}
        </p>
        <button className="btn primary" disabled={status.claimedToday} onClick={claim}>
          {status.claimedToday ? 'Collected' : 'Collect reward'}
        </button>
      </div>
    </>
  )
}
