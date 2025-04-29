import { Component } from 'react';

export class ErrorBoundary extends Component<React.PropsWithChildren> {
  state: {
    error: (Error & { friendlyMessage?: string }) | null;
  };

  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen w-screen overflow-hidden flex flex-col items-center justify-center">
          <span className="text-4xl font-bold">😰 Uh oh!</span>
          <span className="text-1xl">Something went wrong.</span>
          {this.state.error.friendlyMessage && (
            <pre className="mt-10 text-sm opacity-60">
              {this.state.error.friendlyMessage}
            </pre>
          )}

          <div className="flex gap-2 mt-5">
            <button
              type="button"
              className="btn w-32"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
