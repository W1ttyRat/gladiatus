import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Kind = 'ok' | 'error'
interface ToastItem {
  id: number
  kind: Kind
  text: string
}

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const next = useRef(1)

  const push = useCallback((text: string, kind: Kind = 'ok') => {
    const id = next.current++
    setItems((l) => [...l.slice(-3), { id, kind, text }])
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 4000)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

/** Runs an API action and turns a failure into an error toast. Returns undefined when it failed. */
export function useAction() {
  const toast = useToast()
  return useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await fn()
      } catch (e) {
        toast((e as Error).message, 'error')
        return undefined
      }
    },
    [toast],
  )
}
