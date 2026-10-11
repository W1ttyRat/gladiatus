import type { ItemStats } from '../api'

const LABELS: [keyof ItemStats, string][] = [
  ['strength', 'STR'],
  ['dexterity', 'DEX'],
  ['constitution', 'CON'],
  ['charisma', 'CHA'],
  ['intelligence', 'INT'],
  ['hp', 'HP'],
]

export function bonusText(i: ItemStats) {
  return (
    LABELS.filter(([k]) => i[k] > 0)
      .map(([k, l]) => `+${i[k]} ${l}`)
      .join(' · ') || 'no bonus'
  )
}
