import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Read-only, syntax-neutral source viewer for the architecture-as-code files
 * (PRD 32). Monaco is reserved for the evidence explorer; policy YAML just
 * needs to be legible and copyable.
 */
export function CodeBlock({
  code,
  path,
  className,
  maxHeight = 420,
  highlightLines = [],
}: {
  code: string
  path: string
  className?: string
  maxHeight?: number
  highlightLines?: number[]
}) {
  const [copied, setCopied] = useState(false)
  const lines = code.replace(/\n$/, '').split('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={cn('overflow-hidden', className)}>
      <div className="flex items-center gap-2 border-b border-line bg-canvas/60 px-3 py-1.5">
        <span className="truncate font-mono text-[11px] text-subtle">{path}</span>
        <button
          type="button"
          onClick={copy}
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-subtle transition-colors hover:bg-raised hover:text-muted"
        >
          {copied ? <Check className="size-3 text-pass" /> : <Copy className="size-3" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre
        className="overflow-auto bg-canvas/40 px-3 py-2.5 font-mono text-[11.5px] leading-[1.65] text-muted"
        style={{ maxHeight }}
      >
        <code>
          {lines.map((line, i) => (
            <span
              key={i}
              className={cn(
                'block -mx-3 px-3',
                highlightLines.includes(i + 1) && 'bg-accent/10 text-fg',
              )}
            >
              <span className="mr-3 inline-block w-6 select-none text-right text-subtle/60 tabular">
                {i + 1}
              </span>
              {line || '\u00a0'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
