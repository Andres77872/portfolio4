import React from 'react';
import { GameState } from './types';
import MatrixRPGInput from './MatrixRPGInput';

interface Props {
  content: string;
  gameState: GameState;
  terminalRef: React.RefObject<HTMLPreElement>;
  userInput: string;
  isProcessing: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function MatrixRPGTerminal({
  content, gameState, terminalRef, userInput, isProcessing, onInputChange, onKeyPress, onSubmit
}: Props) {
  return (
    <div className="matrix-rpg-terminal">
      <pre className="matrix-rpg-terminal-content" ref={terminalRef}>
        {content}
      </pre>
      
      {gameState === 'interactive' && (
        <MatrixRPGInput 
          userInput={userInput}
          isProcessing={isProcessing}
          onInputChange={onInputChange}
          onKeyPress={onKeyPress}
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
} 