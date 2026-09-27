import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react'
import {
  AlertTriangle,
  Boxes,
  FileCode2,
  Focus,
  Gavel,
  Maximize2,
  ScrollText,
  Waypoints,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Badge'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { api } from '@/services/api'
import {
  CONTRACTS,
  EXTERNAL_CONSUMERS,
  OWNERS,
  componentById,
  contractById,
} from '@/data/repository'
import { cn } from '@/lib/cn'
import { shortPath } from '@/lib/format'
import type { Component, ComponentType, Contract, EvidenceRef, Relationship } from '@/types'

/**
 * 18.2 Knowledge graph + node inspector.
 *
 * Two jobs: make the layering of the repository visible at a glance, and answer
 * "what breaks if I change this?" for any single node. The inspector is the
 * reason the graph exists; the canvas is how you navigate to it.
 */

/** Left-to-right lanes, in dependency order. */
const LANES: ComponentType[] = [
  'frontend',
  'api',
  'service',
  'repository',
  'event',
  'database',
  'library',
  'external',
]

const TYPE_COLOR: Record<ComponentType, string> = {
  frontend: '#4d8dff',
  api: '#a78bfa',
  service: '#35d6a0',
  repository: '#22d3ee',
  database: '#f6b545',
  event: '#fb923c',
  library: '#94a5bb',
  external: '#64748b',
}

interface ComponentNodeData extends Record<string, unknown> {
  component: Component
  degree: number
  violated: number
  contracts: Contract[]
  dependents: string[]
  dependencies: string[]
}

type ComponentFlowNode = Node<ComponentNodeData, 'component'>

const NODE_TYPES: NodeTypes = { component: ComponentNode }

export default function ArchitecturePage() {
  const [components, setComponents] = useState<Component[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string>()
  const [focusId, setFocusId] = useState<string>()

  useEffect(() => {
    let alive = true
    ;(async () => {
      const g = await api.getGraph()
      if (!alive) return
      setComponents(g.components)
      setRelationships(g.relationships)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const { nodes, edges } = useMemo(
    () => buildGraph(components, relationships, focusId),
    [components, relationships, focusId],
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => setSelected(node.id), [])

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="18.2 · Knowledge graph" title="Architecture" />
        <Skeleton className="h-[34rem]" />
      </>
    )
  }

  const selectedComponent = selected ? componentById(selected) : undefined
  const violations = relationships.filter((r) => !r.allowed)

  return (
    <>
      <PageHeader
        eyebrow="18.2 · Knowledge graph"
        title="Architecture graph"
        description="Components and the edges the indexer found between them. Red edges violate an architecture rule. Select any node to inspect its dependents, dependencies, contracts and owner."
        actions={
          focusId ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<X className="size-3.5" />}
              onClick={() => {
                setFocusId(undefined)
                setSelected(undefined)
              }}
            >
              Clear focus
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-subtle">
              <Focus className="size-3.5" />
              Select a node, then focus it to isolate its blast radius
            </span>
          )
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel flush className="min-w-0">
          <PanelHeader
            eyebrow={`${components.length} components · ${relationships.length} relationships`}
            title={focusId ? `Blast radius of ${componentById(focusId)?.name ?? focusId}` : 'Full component graph'}
            description={
              focusId
                ? 'Only nodes within four hops of the focused component are shown.'
                : 'Drag to pan, scroll to zoom, click a node for detail.'
            }
            action={
              violations.length > 0 ? (
                <Chip className="text-block">
                  <AlertTriangle className="size-3" /> {violations.length} rule violations
                </Chip>
              ) : (
                <Chip className="text-pass">No drift</Chip>
              )
            }
          />
          <div className="h-[34rem]">
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodeClick={onNodeClick}
                nodeTypes={NODE_TYPES}
                fitView
                fitViewOptions={{ padding: 0.15 }}
                minZoom={0.3}
                maxZoom={2.2}
                proOptions={{ hideAttribution: true }}
                className="bg-canvas/40"
                nodesConnectable={false}
                elementsSelectable
              >
                <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#1c2635" />
                <Controls showInteractive={false} position="bottom-right" />
                <MiniMap
                  pannable
                  zoomable
                  position="bottom-left"
                  maskColor="color-mix(in oklab, #06090e 78%, transparent)"
                  nodeStrokeWidth={0}
                  nodeColor={(n) => {
                    const c = (n as ComponentFlowNode).data?.component
                    return c ? TYPE_COLOR[c.type] : '#2a3949'
                  }}
                />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line px-4 py-2.5">
            {LANES.filter((t) => components.some((c) => c.type === t)).map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 text-[11px] text-subtle">
                <span className="size-2 rounded-sm" style={{ backgroundColor: TYPE_COLOR[t] }} />
                {t}
              </span>
            ))}
          </div>
        </Panel>

        {/* --------------------------------------------------- Inspector */}
        <div className="space-y-4">
          {selectedComponent ? (
            <Inspector
              component={selectedComponent}
              relationships={relationships}
              focusing={focusId === selectedComponent.id}
              onFocus={() =>
                setFocusId((f) => (f === selectedComponent.id ? undefined : selectedComponent.id))
              }
            />
          ) : (
            <Panel>
              <PanelHeader eyebrow="Inspector" title="No node selected" />
              <PanelBody>
                <EmptyState
                  icon={<Waypoints className="size-6" />}
                  title="Pick a component"
                  description="The inspector shows dependents, dependencies, the contracts it takes part in, its owning team and the change requests that touched it."
                />
              </PanelBody>
            </Panel>
          )}

          <Panel flush>
            <PanelHeader
              eyebrow="Index"
              title="Rule violations"
              description="Pre-existing drift in the indexed graph, independent of any change request."
            />
            {violations.length === 0 ? (
              <EmptyState title="No drift" description="Every indexed edge is permitted by a rule." />
            ) : (
              <ul className="divide-y divide-line">
                {violations.map((v) => (
                  <li key={v.id} className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-3.5 shrink-0 text-block" />
                      <p className="truncate text-xs font-medium text-fg">
                        {componentById(v.source)?.name} → {componentById(v.target)?.name}
                      </p>
                      <Chip className="ml-auto shrink-0 text-block">{v.violatedRuleId}</Chip>
                    </div>
                    <p className="mt-1 pl-5 font-mono text-[10px] text-subtle">{v.type.replace('_', ' ')}</p>
                    {v.evidence[0] ? (
                      <p className="mt-0.5 pl-5 font-mono text-[10px] text-subtle">
                        {shortPath(v.evidence[0].path, 40)}:{v.evidence[0].line}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Graph construction
 * ------------------------------------------------------------------ */

function buildGraph(
  components: Component[],
  relationships: Relationship[],
  focusId?: string,
): { nodes: ComponentFlowNode[]; edges: Edge[] } {
  const degree = new Map<string, number>()
  const violated = new Map<string, number>()
  const adjacency = new Map<string, Set<string>>()

  for (const r of relationships) {
    degree.set(r.source, (degree.get(r.source) ?? 0) + 1)
    degree.set(r.target, (degree.get(r.target) ?? 0) + 1)
    if (!adjacency.has(r.source)) adjacency.set(r.source, new Set())
    adjacency.get(r.source)!.add(r.target)
    if (!r.allowed) {
      violated.set(r.source, (violated.get(r.source) ?? 0) + 1)
      violated.set(r.target, (violated.get(r.target) ?? 0) + 1)
    }
  }

  // Focus mode: keep only the focused node and everything within four hops.
  const reachable = focusId ? bfs(adjacency, focusId, 4) : undefined
  const visible = (id: string) => !reachable || id === focusId || reachable.has(id)

  const laneCounters = new Map<ComponentType, number>()
  const nodes: ComponentFlowNode[] = components
    .filter((c) => visible(c.id))
    .map((component) => {
      const row = laneCounters.get(component.type) ?? 0
      laneCounters.set(component.type, row + 1)
      return {
        id: component.id,
        type: 'component',
        position: { x: laneIndex(component.type) * 270, y: row * 78 },
        data: {
          component,
          degree: degree.get(component.id) ?? 0,
          violated: violated.get(component.id) ?? 0,
          contracts: contractsFor(component.id),
          dependents: relationships.filter((r) => r.target === component.id).map((r) => r.source),
          dependencies: relationships.filter((r) => r.source === component.id).map((r) => r.target),
        },
      }
    })

  const edges: Edge[] = relationships
    .filter((r) => visible(r.source) && visible(r.target))
    .map((r) => ({
      id: r.id,
      source: r.source,
      target: r.target,
      label: r.allowed ? undefined : r.violatedRuleId,
      className: r.allowed ? 'edge-allowed' : 'edge-violated',
      animated: !r.allowed,
      labelStyle: { fill: '#fb7185', fontSize: 9 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 3,
      labelBgStyle: { fill: '#101722' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: r.allowed ? '#3b4d61' : '#fb7185',
        width: 14,
        height: 14,
      },
    }))

  return { nodes, edges }
}

function laneIndex(type: ComponentType): number {
  const i = LANES.indexOf(type)
  return i < 0 ? LANES.length : i
}

function contractsFor(componentId: string): Contract[] {
  return CONTRACTS.filter((c) => c.consumers.includes(componentId) || c.providers.includes(componentId))
}

function bfs(graph: Map<string, Set<string>>, start: string, depth: number): Set<string> {
  const seen = new Set<string>([start])
  let frontier = [start]
  for (let d = 0; d < depth; d++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const n of graph.get(id) ?? []) {
        if (!seen.has(n)) {
          seen.add(n)
          next.push(n)
        }
      }
    }
    frontier = next
  }
  return seen
}

/* ------------------------------------------------------------------ *
 * Node
 * ------------------------------------------------------------------ */

function ComponentNode({ data, selected }: NodeProps<ComponentFlowNode>) {
  const colour = TYPE_COLOR[data.component.type]

  return (
    <div
      className={cn(
        'w-52 rounded-lg border bg-panel px-3 py-2 shadow-lg transition-colors',
        selected ? 'border-accent' : 'border-line',
      )}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: colour }} />
        <p className="truncate text-xs font-semibold text-fg">{data.component.name}</p>
        {data.violated > 0 ? (
          <AlertTriangle className="ml-auto size-3 shrink-0 text-block" aria-label="rule violation" />
        ) : null}
      </div>
      <p className="mt-0.5 truncate font-mono text-[9.5px] text-subtle">
        {shortPath(data.component.path, 30)}
      </p>
      <div className="mt-1 flex items-center gap-2 text-[9.5px] text-subtle">
        <span className="inline-flex items-center gap-0.5" title="edges">
          <Boxes className="size-2.5" />
          {data.degree}
        </span>
        <span className="inline-flex items-center gap-0.5" title="dependents">
          <Waypoints className="size-2.5" />
          {data.dependents.length}
        </span>
        {data.contracts.length > 0 ? (
          <span className="inline-flex items-center gap-0.5" title="contracts">
            <Gavel className="size-2.5" />
            {data.contracts.length}
          </span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Inspector
 * ------------------------------------------------------------------ */

function Inspector({
  component,
  relationships,
  onFocus,
  focusing,
}: {
  component: Component
  relationships: Relationship[]
  onFocus: () => void
  focusing: boolean
}) {
  const dependents = relationships.filter((r) => r.target === component.id)
  const dependencies = relationships.filter((r) => r.source === component.id)
  const contracts = contractsFor(component.id)
  const owner = OWNERS.find((o) => o.components.includes(component.id))
  const external = EXTERNAL_CONSUMERS.filter((e) => contracts.some((c) => c.id === e.contract))

  return (
    <>
      <Panel flush>
        <PanelHeader
          eyebrow={component.type}
          title={component.name}
          description={component.description}
          action={<span className="size-3 rounded-sm" style={{ backgroundColor: TYPE_COLOR[component.type] }} />}
        />
        <PanelBody className="space-y-3">
          <dl className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-subtle">Path</dt>
              <dd className="truncate font-mono text-muted">{component.path}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-subtle">Owner</dt>
              <dd className="text-muted">{owner?.team ?? component.owner}</dd>
            </div>
            {owner ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-subtle">Reviewers</dt>
                <dd className="text-muted">{owner.reviewers.join(', ')}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-subtle">Edges</dt>
              <dd className="tabular font-mono text-muted">{dependents.length + dependencies.length}</dd>
            </div>
          </dl>
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            icon={<Maximize2 className="size-3.5" />}
            onClick={onFocus}
          >
            {focusing ? 'Show full graph' : 'Focus blast radius'}
          </Button>
        </PanelBody>
      </Panel>

      <RelationList
        title="Dependents"
        note="Components that would break if this one changed."
        icon={<Boxes className="size-3.5" />}
        items={dependents.map((r) => ({ id: r.source, type: r.type, allowed: r.allowed, evidence: r.evidence[0] }))}
        empty="Nothing depends on this component."
      />

      <RelationList
        title="Dependencies"
        note="What this component reaches for."
        icon={<FileCode2 className="size-3.5" />}
        items={dependencies.map((r) => ({ id: r.target, type: r.type, allowed: r.allowed, evidence: r.evidence[0] }))}
        empty="This component has no outgoing edges."
      />

      <Panel flush>
        <PanelHeader
          title={
            <span className="flex items-center gap-2">
              <Gavel className="size-3.5" />
              Contracts
              <span className="tabular rounded bg-raised px-1.5 py-px font-mono text-[10px] text-muted">
                {contracts.length}
              </span>
            </span>
          }
          description="Changing this component without a version strategy breaks these."
        />
        {contracts.length === 0 ? (
          <p className="px-4 py-3 text-xs text-subtle">No contract references this component.</p>
        ) : (
          <ul className="divide-y divide-line">
            {contracts.map((c) => (
              <li key={c.id} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-medium text-fg">{c.name}</p>
                  <Chip mono>v{c.version}</Chip>
                  {c.isPublic ? <Chip className="text-review">public</Chip> : null}
                </div>
                <p className="mt-1 font-mono text-[10px] text-subtle">{c.source}</p>
                <p className="mt-0.5 text-[10px] text-subtle">
                  {c.providers.length} provider · {c.consumers.length} consumers
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {external.length > 0 ? (
        <Panel flush>
          <PanelHeader
            title={
              <span className="flex items-center gap-2">
                <ScrollText className="size-3.5" />
                Out-of-repo consumers
                <span className="tabular rounded bg-raised px-1.5 py-px font-mono text-[10px] text-muted">
                  {external.length}
                </span>
              </span>
            }
            description="Not in this repository, so the gate cannot read their code - only the contract."
          />
          <ul className="divide-y divide-line">
            {external.map((e) => (
              <li key={e.name} className="flex items-center gap-2 px-4 py-2">
                <span className="truncate font-mono text-[11px] text-fg">{e.name}</span>
                <Chip>{e.kind}</Chip>
                <Chip mono className="ml-auto shrink-0">
                  {contractById(e.contract)?.name}
                </Chip>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </>
  )
}

function RelationList({
  title,
  note,
  icon,
  items,
  empty,
}: {
  title: string
  note: string
  icon: React.ReactNode
  items: { id: string; type: string; allowed: boolean; evidence?: EvidenceRef }[]
  empty: string
}) {
  return (
    <Panel flush>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            {icon}
            {title}
            <span className="tabular rounded bg-raised px-1.5 py-px font-mono text-[10px] text-muted">
              {items.length}
            </span>
          </span>
        }
        description={note}
      />
      {items.length === 0 ? (
        <p className="px-4 py-3 text-xs text-subtle">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={`${item.id}-${item.type}`} className="px-4 py-2">
              <div className="flex items-center gap-2">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: TYPE_COLOR[componentById(item.id)?.type ?? 'library'] }}
                />
                <p className="truncate text-xs text-fg">{componentById(item.id)?.name ?? item.id}</p>
                <Chip className="ml-auto shrink-0">{item.type.replace('_', ' ')}</Chip>
                {!item.allowed ? <AlertTriangle className="size-3 shrink-0 text-block" /> : null}
              </div>
              {item.evidence ? (
                <p className="mt-0.5 pl-3.5 font-mono text-[10px] text-subtle">
                  {shortPath(item.evidence.path, 38)}:{item.evidence.line}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
