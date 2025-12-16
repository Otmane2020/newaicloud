import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Ignore benign DOM cleanup errors that happen during rapid navigation
    const isBenignDomError =
      error.name === 'NotFoundError' &&
      error.message.includes('removeChild');

    // Ignore App Bridge context errors (happen when not in Shopify Admin)
    const isAppBridgeError =
      error.message.includes('useAppBridge') ||
      error.message.includes('AppBridge') ||
      error.message.includes('shopify');

    // Some merchants see transient React errors (#300, #380) that can be
    // resolved with a single reload. Handle these gracefully.
    const isReact380Error = error.message.includes('Minified React error #380');
    const isReact300Error = error.message.includes('Minified React error #300');
    const isTransientReactError = isReact380Error || isReact300Error;

    const isInShopifyAdmin =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('host');

    if (isTransientReactError && typeof window !== 'undefined') {
      try {
        const storage = window.sessionStorage;
        const errorKey = isReact300Error ? 'react_300_reloaded' : 'react_380_reloaded';
        const hasReloaded = storage.getItem(errorKey) === '1';
        if (!hasReloaded) {
          storage.setItem(errorKey, '1');
          console.warn(`[ErrorBoundary] React error detected, reloading once: ${error.message}`);
          // Clear any cached data that might be corrupted
          localStorage.removeItem('usage-limits-cache');
          window.location.reload();
        }
      } catch (e) {
        console.warn('[ErrorBoundary] Failed to use sessionStorage for React error handling', e);
      }

      // Do not switch to error UI for this transient issue
      return { hasError: false, error: null };
    }

    if (isBenignDomError || isAppBridgeError) {
      console.warn('[ErrorBoundary] Ignoring benign error:', error.message);
      return { hasError: false, error: null };
    }

    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log non-benign errors
    const isBenignDomError =
      error.name === 'NotFoundError' &&
      error.message.includes('removeChild');

    const isAppBridgeError =
      error.message.includes('useAppBridge') ||
      error.message.includes('AppBridge') ||
      error.message.includes('shopify');

    const isReact380Error = error.message.includes('Minified React error #380');
    const isReact300Error = error.message.includes('Minified React error #300');
    const isTransientReactError = isReact380Error || isReact300Error;

    const isInShopifyAdmin =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('host');

    if (!isBenignDomError && !isAppBridgeError && !isTransientReactError) {
      console.error('[ErrorBoundary] Uncaught error:', error);
      console.error('[ErrorBoundary] Error info:', errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>An error has occurred</AlertTitle>
              <AlertDescription className="mt-2 space-y-4">
                <p className="text-sm">
                  The application encountered an unexpected error.
                </p>
                {this.state.error && (
                  <details className="text-xs bg-muted p-2 rounded">
                    <summary className="cursor-pointer font-medium">
                      Error details
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
                <Button 
                  onClick={this.handleReset}
                  variant="outline"
                  className="w-full"
                >
                  Reload the application
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
