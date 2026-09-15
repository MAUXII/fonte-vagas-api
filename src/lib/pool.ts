export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []
  const out: R[] = new Array(items.length)
  let i = 0

  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx]!)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
  return out
}
