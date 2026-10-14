/** A labelled progress bar. `tone` picks the fill colour from the theme. */
export default function Bar({
  label,
  value,
  max,
  tone = 'bronze',
  hint,
  quiet,
}: {
  label: string
  value: number
  max: number
  tone?: 'bronze' | 'blood' | 'laurel' | 'lapis'
  hint?: string
  /** hide the visible label (it stays available to screen readers) */
  quiet?: boolean
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="bar" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="bar-head">
        <span>{quiet ? '' : label}</span>
        <span className="num">
          {value}/{max}
          {hint && <span className="muted"> {hint}</span>}
        </span>
      </div>
      <div className={`bar-track ${tone}`}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
