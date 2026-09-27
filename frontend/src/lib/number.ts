/** Number formatting for metric tiles and tables. */

/** 24_000_000 -> "24M", 780_000 -> "780k", 900 -> "900". */
export function compactNumber(n: number): string {
  if (n >= 1_000_000_000) return `${trim(n / 1_000_000_000)}B`
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`
  if (n >= 1_000) return `${trim(n / 1_000)}k`
  return String(n)
}

function trim(n: number): string {
  const fixed = n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)
  return fixed.replace(/\.?0+$/, '')
}

/** Signed delta with an explicit sign, e.g. "+12", "-4". */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n)
}
