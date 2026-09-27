import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ChangeRequest, Project } from '@/types'
import { api } from '@/services/api'

/**
 * App-wide state: the indexed project, the change-request list and toasts.
 * Run / finding / remediation state is page-local because it is only meaningful
 * on the screen that is currently showing it.
 */

export interface Toast {
  id: number
  title: string
  detail?: string
  tone: 'info' | 'pass' | 'block' | 'review'
}

interface AppState {
  project: Project | undefined
  projectLoading: boolean
  indexing: boolean
  reindex: () => Promise<void>
  requests: ChangeRequest[]
  requestsLoading: boolean
  refreshRequests: () => Promise<void>
  toasts: Toast[]
  notify: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project>()
  const [projectLoading, setProjectLoading] = useState(true)
  const [indexing, setIndexing] = useState(false)
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const refreshRequests = useCallback(async () => {
    setRequestsLoading(true)
    try {
      setRequests(await api.listChangeRequests())
    } finally {
      setRequestsLoading(false)
    }
  }, [])

  const reindex = useCallback(async () => {
    setIndexing(true)
    try {
      setProject(await api.reindexProject())
      notify({ title: 'Repository re-indexed', detail: 'Knowledge graph refreshed from the default branch.', tone: 'pass' })
    } finally {
      setIndexing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const notify = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5200)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [p, r] = await Promise.all([api.getProject(), api.listChangeRequests()])
      if (!alive) return
      setProject(p)
      setRequests(r)
      setProjectLoading(false)
      setRequestsLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const value = useMemo<AppState>(
    () => ({
      project,
      projectLoading,
      indexing,
      reindex,
      requests,
      requestsLoading,
      refreshRequests,
      toasts,
      notify,
      dismiss,
    }),
    [project, projectLoading, indexing, reindex, requests, requestsLoading, refreshRequests, toasts, notify, dismiss],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
