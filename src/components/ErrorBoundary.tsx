import React, { Component, ReactNode } from 'react';
import { FirebaseError } from 'firebase/app';
import { captureException } from '../lib/sentry-config';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, eventId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });

    // Log Firebase-specific errors with more context
    if (error instanceof FirebaseError) {
      console.error('Firebase Error Code:', error.code);
      console.error('Firebase Error Message:', error.message);
      console.error('Firebase Error Details:', error.customData);
    }

    // Report to Sentry
    try {
      captureException(error, {
        tags: {
          boundary: 'root',
          firebase: error instanceof FirebaseError ? 'true' : 'false',
          code: error instanceof FirebaseError ? error.code : undefined,
        },
        extra: {
          componentStack: errorInfo.componentStack,
          errorInfo,
        },
        level: 'error',
      });
    } catch (sentryError) {
      console.error('Failed to report error to Sentry:', sentryError);
    }
  }

  private getFirebaseErrorMessage(error: Error): string {
    if (!(error instanceof FirebaseError)) {
      return error.message;
    }

    // Provide user-friendly messages for common Firebase errors
    switch (error.code) {
      case 'permission-denied':
        return 'You do not have permission to access this resource. Please contact your administrator.';
      case 'unavailable':
        return 'Firebase service is temporarily unavailable. Please try again in a moment.';
      case 'unauthenticated':
        return 'You must be signed in to perform this action. Please sign in and try again.';
      case 'not-found':
        return 'The requested resource was not found.';
      case 'already-exists':
        return 'This resource already exists.';
      case 'resource-exhausted':
        return 'Too many requests. Please try again later.';
      case 'failed-precondition':
        return 'The operation was rejected because the system is not in a required state.';
      case 'aborted':
        return 'The operation was aborted. Please try again.';
      case 'out-of-range':
        return 'The operation was attempted past the valid range.';
      case 'unimplemented':
        return 'This operation is not implemented or supported.';
      case 'internal':
        return 'An internal error occurred. Please try again later.';
      case 'data-loss':
        return 'Unrecoverable data loss or corruption occurred.';
      case 'auth/email-already-in-use':
        return 'This email address is already in use.';
      case 'auth/invalid-email':
        return 'The email address is invalid.';
      case 'auth/weak-password':
        return 'The password is too weak. Please use a stronger password.';
      case 'auth/user-not-found':
        return 'No user found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      default:
        return error.message;
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const isFirebaseError = this.state.error instanceof FirebaseError;
      const userFriendlyMessage = this.getFirebaseErrorMessage(this.state.error);

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fee',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
          >
            <h1 style={{ color: '#B71C1C', marginBottom: '16px', fontSize: '24px' }}>
              {isFirebaseError ? 'Firebase Error' : 'Something went wrong'}
            </h1>

            <p style={{ color: '#333', marginBottom: '16px', fontSize: '16px' }}>
              {userFriendlyMessage}
            </p>

            {isFirebaseError && (
              <div
                style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  padding: '12px',
                  marginBottom: '16px',
                }}
              >
                <strong style={{ color: '#856404' }}>Error Code:</strong>{' '}
                <code style={{ color: '#856404' }}>{(this.state.error as FirebaseError).code}</code>
              </div>
            )}

            {import.meta.env.DEV && (
              <details style={{ marginBottom: '16px' }}>
                <summary
                  style={{
                    cursor: 'pointer',
                    color: '#666',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                  }}
                >
                  Technical Details (Development Only)
                </summary>
                <pre
                  style={{
                    backgroundColor: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '12px',
                    color: '#333',
                    maxHeight: '300px',
                  }}
                >
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#B71C1C',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Reload Page
              </button>

              <button
                onClick={() => (window.location.href = '/')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Go to Home
              </button>
            </div>

            {isFirebaseError &&
              (this.state.error as FirebaseError).code === 'permission-denied' && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '12px',
                    backgroundColor: '#e3f2fd',
                    border: '1px solid #2196f3',
                    borderRadius: '4px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '14px', color: '#1565c0' }}>
                    <strong>Tip:</strong> If you're developing locally, make sure Firebase security
                    rules are deployed:
                  </p>
                  <code
                    style={{
                      display: 'block',
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#fff',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    npm run firebase:deploy:rules
                  </code>
                </div>
              )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
