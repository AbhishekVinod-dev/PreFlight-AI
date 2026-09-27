/** Presentation helpers. No domain logic lives here. */

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const s = Math.round(diff / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export function absoluteTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function duration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export function shortPath(path: string, max = 46): string {
  if (path.length <= max) return path
  const parts = path.split('/')
  if (parts.length <= 3) return `...${path.slice(-(max - 3))}`
  return `${parts[0]}/.../${parts.slice(-2).join('/')}`
}

export function fileName(path: string): string {
  return path.split('/').pop() ?? path
}

export function extension(path: string): string {
  const ext = path.split('.').pop()
  return ext && ext.length <= 5 ? `.${ext}` : ''
}

export function titleCase(s: string): string {
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export function sentenceCase(s: string): string {
  const t = s.replace(/[_-]+/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function countLabel(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`
}
