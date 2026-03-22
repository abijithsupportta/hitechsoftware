'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[AuthErrorBoundary] Uncaught auth error:', error, info.componentStack);
  }

  handleReload(): void {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 shadow-lg">
            <span className="text-2xl font-bold text-white">HT</span>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-white">
            Something went wrong loading the application.
          </h1>
          <p className="mb-8 max-w-sm text-sm text-slate-400">
            An error occurred during initialization. Please refresh the page. If the
            problem persists, contact your system administrator.
          </p>
          <button
            type="button"
            onClick={this.handleReload.bind(this)}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 active:bg-blue-700"
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.errorMessage && (
            <pre className="mt-8 max-w-lg overflow-auto rounded-lg bg-slate-800 p-4 text-left text-xs text-red-400">
              {this.state.errorMessage}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
