import React, { useEffect, useState } from 'react';
import { GameState } from './types';
import MatrixRPGInput from './MatrixRPGInput';
import MatrixRPGCanvas from './MatrixRPGCanvas';

interface Props {
  content: string;
  gameState: GameState;
  userInput: string;
  isProcessing: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function MatrixRPGTerminal({
  content, gameState, userInput, isProcessing, onInputChange, onKeyPress, onSubmit
}: Props) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Reserve space for input if in interactive mode
      const inputHeight = gameState === 'interactive' ? 80 : 0;
      setDimensions({
        width: rect.width,
        height: rect.height - inputHeight
      });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [gameState]);

  return (
    <div className="matrix-rpg-terminal" ref={containerRef}>
      <MatrixRPGCanvas
        content={content}
        width={dimensions.width}
        height={dimensions.height}
      />

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
