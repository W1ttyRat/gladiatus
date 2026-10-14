import type { ItemStats, Slot } from '../api'
import Icon from './Icon'
import { useTip } from './Tip'

export const SLOT_LABEL: Record<Slot, string> = {
  weapon: 'Weapon',
  helmet: 'Helmet',
  armor: 'Armor',
  boots: 'Boots',
  ring: 'Ring',
  amulet: 'Amulet',
}

const STAT_LABEL: [keyof ItemStats, string][] = [
  ['strength', 'Strength'],
  ['dexterity', 'Dexterity'],
  ['constitution', 'Constitution'],
  ['charisma', 'Charisma'],
  ['intelligence', 'Intelligence'],
  ['hp', 'Health'],
]

export const QUALITIES = [
  { id: 'common', label: 'Common' },
  { id: 'fine', label: 'Fine' },
  { id: 'rare', label: 'Rare' },
  { id: 'epic', label: 'Epic' },
  { id: 'legendary', label: 'Legendary' },
] as const
export type Quality = (typeof QUALITIES)[number]

/** Item quality follows the total stat budget of the piece (health counts a tenth). */
export function qualityOf(i: ItemStats): Quality {
  const score = i.strength + i.dexterity + i.constitution + i.charisma + i.intelligence + i.hp / 10
  return QUALITIES[score < 6 ? 0 : score < 12 ? 1 : score < 20 ? 2 : score < 32 ? 3 : 4]
}

export function bonusText(i: ItemStats) {
  return (
    STAT_LABEL.filter(([k]) => i[k] > 0)
      .map(([k]) => `+${i[k]} ${k === 'hp' ? 'HP' : k.slice(0, 3).toUpperCase()}`)
      .join('  ') || 'no bonus'
  )
}

interface ItemLike extends ItemStats {
  name: string
  slot: Slot
}

/** Tooltip body shared by every place an item appears. */
export function ItemTooltip({ item, extra }: { item: ItemLike; extra?: string }) {
  const q = qualityOf(item)
  return (
    <div className="item-tip">
      <strong className={`q-${q.id}`}>{item.name}</strong>
      <span className="muted">
        {q.label} {SLOT_LABEL[item.slot].toLowerCase()}
      </span>
      <ul>
        {STAT_LABEL.filter(([k]) => item[k] > 0).map(([k, label]) => (
          <li key={k}>
            <span>{label}</span>
            <b>+{item[k]}</b>
          </li>
        ))}
      </ul>
      {extra && <span className="muted">{extra}</span>}
    </div>
  )
}

/** A square (or arched) frame showing the slot icon, coloured by quality, with a hover tooltip. */
export function ItemCell({
  item,
  extra,
  arch,
  selected,
  ...rest
}: {
  item: ItemLike
  extra?: string
  arch?: boolean
  selected?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  const tip = useTip(<ItemTooltip item={item} extra={extra} />)
  const q = qualityOf(item)
  return (
    <div
      {...tip}
      {...rest}
      className={`cell q-${q.id} ${arch ? 'arch' : ''} ${selected ? 'selected' : ''} ${rest.className ?? ''}`}
      tabIndex={0}
      aria-label={`${item.name}, ${q.label} ${item.slot}`}
    >
      <Icon name={item.slot} size={arch ? 34 : 26} />
    </div>
  )
}
