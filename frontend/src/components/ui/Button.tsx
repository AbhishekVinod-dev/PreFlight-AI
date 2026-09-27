import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent/90 active:bg-accent disabled:hover:bg-accent shadow-[0_1px_2px_rgba(0,0,0,0.18),0_-1px_0_rgba(0,0,0,0.10)_inset]',
  secondary:
    'bg-white text-fg border border-line-strong hover:border-accent/70 hover:bg-surface hover:text-accent disabled:hover:border-line-strong disabled:hover:bg-white',
  ghost: 'text-muted hover:text-fg hover:bg-panel active:bg-raised',
  danger: 'bg-block/10 text-block border border-block/35 hover:bg-block/20 hover:border-block/60',
  success: 'bg-pass/10 text-pass border border-pass/35 hover:bg-pass/20 hover:border-pass/60',
  quiet: 'text-subtle hover:text-muted hover:bg-panel',
}

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-md',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
}

export type ButtonVariant = Variant
export type ButtonSize = Size

/**
 * Class string for a button appearance. Exported so anchors and links can
 * borrow the exact same visual weight without rendering a real <button>.
 */
export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center font-medium transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-45',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : icon}
      {children}
    </button>
  )
})
