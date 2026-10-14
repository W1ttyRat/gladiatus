import { useEffect, useState } from 'react'
import { api, type Report, type ReportRow } from '../api'
import { RoundBars, splitLog } from '../components/BattleStage'
import Icon from '../components/Icon'
import { useAction } from '../components/Toast'

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

const outcome = (r: ReportRow) => (r.won ? 'Victory' : r.draw ? 'Draw' : 'Defeat')

export default function Reports() {
  const [rows, setRows] = useState<ReportRow[] | null>(null)
  const [open, setOpen] = useState<Report | null>(null)
  const act = useAction()

  useEffect(() => {
    act(api.reports).then((r) => r && setRows(r))
  }, [act])

  async function toggle(id: number) {
    if (open?.id === id) return setOpen(null)
    const r = await act(() => api.report(id))
    if (r) setOpen(r)
  }

  return (
    <>
      <h2>Reports</h2>
      <p className="lede">Your last 30 fights, in expeditions and in the arena. Open one to read it again.</p>
      {rows && rows.length === 0 && <p className="empty">No fights yet. Head to the expeditions and make some history.</p>}
      <ul className="reports">
        {rows?.map((r) => {
          const seg = open?.id === r.id ? splitLog(open.log) : null
          return (
            <li key={r.id} className={`report ${r.won ? 'win' : r.draw ? 'draw' : 'lose'}`}>
              <button className="report-head" onClick={() => toggle(r.id)} aria-expanded={open?.id === r.id}>
                <Icon name={r.kind === 'arena' ? 'arena' : 'map'} size={20} />
                <span className="report-title">
                  <span><strong>{outcome(r)}</strong> against {r.opponent ?? 'an unknown foe'}</span>
                  <span className="muted">{r.kind === 'arena' ? 'Arena' : 'Expedition'}</span>
                </span>
                <span className="num">{r.playerDamage} : {r.enemyDamage}</span>
                <span className="muted">{ago(r.createdAt)}</span>
              </button>
              {open?.id === r.id && seg && (
                <div className="report-body">
                  {open.rounds && <RoundBars rounds={open.rounds} />}
                  <div className="stage-log static">
                    {[...seg.intro, ...seg.rounds.flatMap((l, i) => [`Round ${i + 1}`, ...l]), ...seg.epilogue].map((l, i) => (
                      <p key={i} className={/^Round \d+$/.test(l) ? 'log-round' : ''}>{l}</p>
                    ))}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
