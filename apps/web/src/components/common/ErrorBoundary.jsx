import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Real error reporting is added with observability (Prompt 40).
    console.error('UI error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-8 text-center shadow">
        <h2 className="text-xl font-bold">Oops! Something went wrong.</h2>
        <p className="mt-2 text-slate-600">Let's try again.</p>
        <button
          type="button"
          className="mt-4 rounded-full bg-indigo-600 px-5 py-2 font-semibold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
          onClick={() => this.setState({ hasError: false })}
        >
          Try again
        </button>
      </div>
    );
  }
}
