import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface TipState {
  content: ReactNode
  x: number
  y: number
}

const TipContext = createContext<(t: TipState | null) => void>(() => {})

/** Renders one floating tooltip for the whole app, kept inside the viewport. */
export function TipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState | null>(null)
  return (
    <TipContext.Provider value={setTip}>
      {children}
      {tip && (
        <div
          className="tooltip"
          role="tooltip"
          style={{
            left: Math.min(tip.x, window.innerWidth - 270),
            top: tip.y,
          }}
        >
          {tip.content}
        </div>
      )}
    </TipContext.Provider>
  )
}

/** Spread the result on an element: hovering or focusing it shows `content` beside it. */
export function useTip(content: ReactNode) {
  const set = useContext(TipContext)
  const show = useCallback(
    (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      const below = r.top < 160 || r.bottom + 170 < window.innerHeight
      set({ content, x: Math.max(8, r.left + r.width / 2 - 125), y: below ? r.bottom + 8 : Math.max(8, r.top - 150) })
    },
    [set, content],
  )
  return useMemo(
    () => ({
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(e.currentTarget),
      onFocus: (e: React.FocusEvent<HTMLElement>) => show(e.currentTarget),
      onMouseLeave: () => set(null),
      onBlur: () => set(null),
    }),
    [show, set],
  )
}
