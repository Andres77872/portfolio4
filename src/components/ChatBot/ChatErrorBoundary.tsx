import { Component, type ErrorInfo, type ReactNode } from 'react';

import ChatLoadError, { type ChatLoadErrorProps } from './ChatLoadError';

interface ChatErrorBoundaryProps extends ChatLoadErrorProps {
  /** Changing it clears a caught error (the root bumps it on "Try again"). */
  resetKey: number;
  children: ReactNode;
}

interface ChatErrorBoundaryState {
  failed: boolean;
  resetKey: number;
}

/** Keeps a failed panel chunk (or a render error) inside the frame; the rest of the site stays mounted. */
export default class ChatErrorBoundary extends Component<ChatErrorBoundaryProps, ChatErrorBoundaryState> {
  state: ChatErrorBoundaryState = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<ChatErrorBoundaryState> {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: ChatErrorBoundaryProps,
    state: ChatErrorBoundaryState,
  ): Partial<ChatErrorBoundaryState> | null {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error('[portfolio-assistant] panel failed to render', error, info);
  }

  render() {
    const { open, frameRef, onRetry, onClose, children } = this.props;
    if (!this.state.failed) return children;
    return <ChatLoadError open={open} frameRef={frameRef} onRetry={onRetry} onClose={onClose} />;
  }
}
