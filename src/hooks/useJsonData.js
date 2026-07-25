import { useEffect, useState } from 'react'

// Fetches a JSON file from /public/data at runtime, so the site always
// shows whatever the latest GitHub Actions pipeline run committed —
// no rebuild needed when data updates.
export default function useJsonData(path) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(import.meta.env.BASE_URL + path)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${path}`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [path])

  return { data, error, loading }
}
