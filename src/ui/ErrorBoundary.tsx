import { Component, type ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * App-wide error boundary. Catches render-time errors anywhere in the tree
 * and shows a recovery screen instead of a hard crash / white screen, so a
 * single bad render can't take the whole app down (and reassures the user
 * their on-device data is intact).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
     
    console.error('Uncaught render error', error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}
