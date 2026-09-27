import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Spinner } from '@/components/ui/Feedback'
import DashboardPage from '@/pages/DashboardPage'
import NewChangePage from '@/pages/NewChangePage'
import AnalysisPage from '@/pages/AnalysisPage'
import ResultsPage from '@/pages/ResultsPage'
import ChangesPage from '@/pages/ChangesPage'

// Heavy views (graph + Monaco evidence) are split out of the initial bundle.
const ArchitecturePage = lazy(() => import('@/pages/ArchitecturePage'))
const FindingsPage = lazy(() => import('@/pages/FindingsPage'))
const RemediationPage = lazy(() => import('@/pages/RemediationPage'))
const PostFlightPage = lazy(() => import('@/pages/PostFlightPage'))
const PoliciesPage = lazy(() => import('@/pages/PoliciesPage'))
const DecisionsPage = lazy(() => import('@/pages/DecisionsPage'))
const MetricsPage = lazy(() => import('@/pages/MetricsPage'))

function Loading() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Spinner className="size-6" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="changes" element={<ChangesPage />} />
        <Route path="changes/new" element={<NewChangePage />} />
        <Route path="changes/:changeRequestId/analyze" element={<AnalysisPage />} />
        <Route path="runs/:runId" element={<ResultsPage />} />
        <Route path="runs/:runId/findings" element={<FindingsPage />} />
        <Route path="runs/:runId/remediation" element={<RemediationPage />} />
        <Route path="runs/:runId/postflight" element={<PostFlightPage />} />
        <Route
          path="architecture"
          element={
            <Suspense fallback={<Loading />}>
              <ArchitecturePage />
            </Suspense>
          }
        />
        <Route
          path="policies"
          element={
            <Suspense fallback={<Loading />}>
              <PoliciesPage />
            </Suspense>
          }
        />
        <Route
          path="decisions"
          element={
            <Suspense fallback={<Loading />}>
              <DecisionsPage />
            </Suspense>
          }
        />
        <Route
          path="metrics"
          element={
            <Suspense fallback={<Loading />}>
              <MetricsPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
