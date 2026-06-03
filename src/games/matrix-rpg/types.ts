export type GameState = 'initializing' | 'loading' | 'ready' | 'interactive';

export type CrtIntensity = 0 | 1 | 2 | 3;
export type UserSelectableCrtIntensity = 1 | 2 | 3;

export type TerminalStatus = 'idle' | 'connecting' | 'streaming' | 'aborted' | 'error';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface MatrixRPGProps {
  className?: string;
} 
