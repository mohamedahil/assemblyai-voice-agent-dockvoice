import { useSyncExternalStore } from 'react'

type Theme = 'dark' | 'light'

const listeners = new Set<() => void>()

function current(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function toggleTheme(): void {
  const next: Theme = current() === 'dark' ? 'light' : 'dark'
  document.documentElement.classList.toggle('dark', next === 'dark')
  try {
    localStorage.setItem('theme', next)
  } catch {
    // Storage unavailable (private mode); the toggle still works for this visit.
  }
  listeners.forEach((listener) => listener())
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    current,
  )
}
