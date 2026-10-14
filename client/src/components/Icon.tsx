import type { SVGProps } from 'react'

// Small line icons on a 24 grid. Stroke only, so they take the colour of the surrounding text.
const PATHS = {
  hero: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  arena: 'M4 4l16 16M20 4 4 20M4 4h5M4 4v5M20 4h-5M20 4v5',
  box: 'M3 8l9-5 9 5v9l-9 5-9-5zM3 8l9 5 9-5M12 13v9',
  scroll: 'M8 4h10v13a3 3 0 0 1-3 3H6a2 2 0 0 0 2-2zM8 4a2 2 0 0 0-2 2v1h2M11 9h5M11 13h5',
  market: 'M9 3h6M10 3v3c-3 1-4 4-4 7 0 4 2.5 7 6 7s6-3 6-7c0-3-1-6-4-7V3M9 6h6',
  gavel: 'M14 3l7 7-3 3-7-7zM9 8l-6 6 3 3 6-6M3 21h10',
  train: 'M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6',
  report: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
  medal: 'M12 10a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM8 3l4 7 4-7M10.5 15l1 1 2-2',
  weapon: 'M5 19 19 5M15 4h5v5M7 13l4 4M3.5 20.5l2-2',
  helmet: 'M4 15a8 8 0 0 1 16 0v4h-5v-3H9v3H4zM12 3v4',
  armor: 'M8 4 4 7v4l3 1v8h10v-8l3-1V7l-4-3-2 2h-4z',
  boots: 'M8 3h6v8l5 3v5H5v-4l3-2zM8 8h6',
  ring: 'M12 10a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM9.5 6 12 3l2.5 3-2.5 2z',
  amulet: 'M5 3l7 8 7-8M12 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  bolt: 'M13 2 5 13h6l-1 9 8-11h-6z',
  food: 'M5 11h14a7 7 0 0 1-14 0zM9 11c0-3 1-4 3-4s3 1 3 4M3 11h18',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  check: 'M5 12.5 10 17.5 19 7',
  close: 'M6 6l12 12M18 6 6 18',
  logout: 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9',
  skull: 'M12 3a8 8 0 0 0-8 8c0 3 1.5 4.5 3 5.5V20h10v-3.5c1.5-1 3-2.5 3-5.5a8 8 0 0 0-8-8zM9 12h.01M15 12h.01M11 16v2M13 16v2',
  plus: 'M12 5v14M5 12h14',
} as const

export type IconName = keyof typeof PATHS

export default function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
