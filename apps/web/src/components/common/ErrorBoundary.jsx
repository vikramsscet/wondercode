import { Component } from 'react';
import { Button, Card } from '../ui/index.js';

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
      <Card role="alert" className="mx-auto mt-16 max-w-md text-center">
        <h2 className="text-xl font-extrabold">Oops! Something went wrong.</h2>
        <p className="mt-2 text-ink-600">Let's try again.</p>
        <Button className="mt-4" onClick={() => this.setState({ hasError: false })}>
          Try again
        </Button>
      </Card>
    );
  }
}
