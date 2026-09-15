type Entry<T> = { value: T; expires: number }

export function createCache<T>() {
  const store = new Map<string, Entry<T>>()

  return {
    get(key: string): T | undefined {
      const hit = store.get(key)
      if (!hit) return undefined
      if (Date.now() > hit.expires) {
        store.delete(key)
        return undefined
      }
      return hit.value
    },
    set(key: string, value: T, ttlMs: number) {
      store.set(key, { value, expires: Date.now() + ttlMs })
    },
  }
}
