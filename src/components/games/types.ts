import { ComponentType } from 'react';

export interface GameInfo {
  id: string;
  name: string;
  component: ComponentType<{ className?: string; width?: number; height?: number }>;
  description?: string;
}

export interface GameSelectorProps {
  games: GameInfo[];
  currentGameIndex: number;
  onGameChange: (index: number) => void;
  className?: string;
}