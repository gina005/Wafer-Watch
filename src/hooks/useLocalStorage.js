import { useEffect, useState } from 'react'

// Persists a piece of state to localStorage under `key`, so it survives
// page reloads. Used for things like saved/bookmarked articles.
export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // localStorage unavailable (private browsing, etc.) — fail silently
    }
  }, [key, value])

  return [value, setValue]
}
