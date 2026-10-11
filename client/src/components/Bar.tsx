export default function Bar({ label, value, max, color }: { label: string; value: number; max: number; color?: string }) {
  return (
    <div className="bar">
      <span>{label} {value}/{max}</span>
      <div><i style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} /></div>
    </div>
  )
}
