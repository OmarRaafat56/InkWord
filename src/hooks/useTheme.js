import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'inkline-theme'

// New themes just need an entry here and a matching [data-theme='id'] block
// in styles/index.css — everything else (the menu, persistence) already
// supports any number of them.
export const THEMES = [
  { id: 'light', label: 'Light', swatch: '#ffffff', swatchBorder: '#dde1e7' },
  { id: 'dark', label: 'Dark', swatch: '#24262d', swatchBorder: '#4b4f5a' },
]

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored && THEMES.some((t) => t.id === stored)) return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((id) => {
    if (THEMES.some((t) => t.id === id)) setThemeState(id)
  }, [])

  return [theme, setTheme]
}
