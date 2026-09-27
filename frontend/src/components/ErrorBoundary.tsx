import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Human-readable context shown in the fallback. */
  label?: string
}

interface State {
  error: Error | null
}

/**
 * Keeps one failing panel from taking down the whole gate UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[preflight] render error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="panel hatch-block m-6 p-6">
        <p className="eyebrow text-block">Render error{this.props.label ? ` · ${this.props.label}` : ''}</p>
        <h2 className="mt-1 text-lg">This panel could not be displayed</h2>
        <pre className="mono mt-3 max-h-48 overflow-auto rounded border border-line bg-canvas p-3 text-xs text-block">
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-4 rounded border border-line-strong bg-raised px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
        >
          Retry
        </button>
      </div>
    )
  }
}
