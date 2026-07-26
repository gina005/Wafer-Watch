import { Component } from 'react'

// Without this, any uncaught render error anywhere in the tree unmounts the
// whole app, leaving nothing but the page background — a silent black
// screen with no indication anything went wrong. This catches that and
// shows something a person can act on instead.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('WaferWatch crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-graphite text-ink px-5">
          <div className="max-w-md text-center">
            <p className="font-display text-xl mb-2">Something Went Wrong</p>
            <p className="text-muted text-sm leading-relaxed">
              This page hit an unexpected error. Try reloading — if it keeps happening, the underlying data file may
              be malformed.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded text-xs font-mono border border-border text-muted hover:text-copper-bright hover:border-copper/40 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
