export type GameState = 'initializing' | 'loading' | 'checkpoint' | 'ready' | 'typing' | 'interactive';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface MatrixRPGProps {
  className?: string;
  width?: number;
  height?: number;
} 