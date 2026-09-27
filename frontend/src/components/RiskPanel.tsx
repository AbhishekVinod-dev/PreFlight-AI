import type { RiskBreakdown } from '@/types'
import { riskTone } from '@/lib/status'
import { cn } from '@/lib/cn'
import { FactorBar } from '@/components/ui/Feedback'
import { RiskBadge } from '@/components/ui/Badge'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel'

/**
 * 14. Risk model.
 *
 * PRD requirement: "never expose a black-box number without its contributing
 * factors". Every point shown here is attributable to a named factor, and the
 * cap on each factor is visible next to its value.
 */
export function RiskPanel({ risk, className }: { risk: RiskBreakdown; className?: string }) {
  const tone = riskTone[risk.level]
  const contributing = risk.factors.filter((f) => f.weight > 0)

  return (
    <Panel className={className}>
      <PanelHeader
        eyebrow="14 · Risk model"
        title="Why this score"
        description="Risk = architecture + contract + dependency + security + change surface + uncertainty."
        action={<RiskBadge level={risk.level} />}
      />
      <PanelBody className="space-y-4">
        {/* Headline score */}
        <div className="flex items-end gap-4">
          <p className={cn(tone.text, 'tabular text-4xl font-semibold leading-none')}>{risk.score}</p>
          <div className="pb-0.5">
            <p className="text-xs text-subtle">out of 100</p>
            <p className="text-[11px] text-muted">{contributing.length} of {risk.factors.length} factors contribute</p>
          </div>
        </div>

        {/* Factor breakdown */}
        <ul className="space-y-3">
          {risk.factors.map((f) => {
            const ratio = f.max === 0 ? 0 : f.weight / f.max
            return (
              <li key={f.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-medium text-fg">{f.label}</span>
                  <span className="tabular shrink-0 font-mono text-[11px] text-muted">
                    {f.weight}
                    <span className="text-subtle">/{f.max}</span>
                  </span>
                </div>
                <FactorBar
                  weight={f.weight}
                  max={f.max}
                  color={ratio > 0.7 ? tone.hex : ratio > 0.35 ? '#f6b545' : '#2a3949'}
                  className="mt-1.5"
                />
                <p className="mt-1 text-[11px] leading-relaxed text-subtle">{f.detail}</p>
              </li>
            )
          })}
        </ul>

        {risk.drivers.length > 0 ? (
          <div className="rounded-md border border-line bg-canvas/60 p-3">
            <p className="eyebrow">Top drivers</p>
            <ul className="mt-1.5 space-y-1">
              {risk.drivers.map((d) => (
                <li key={d} className="flex items-center gap-2 text-[11px] text-muted">
                  <span className="size-1 rounded-full bg-accent" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </PanelBody>
    </Panel>
  )
}
