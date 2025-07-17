import React, { useEffect, useState } from 'react';
import { GameState } from './types';
import MatrixRPGCanvas from './MatrixRPGCanvas';

interface Props {
  content: string;
  gameState: GameState;
  userInput: string;
  isProcessing: boolean;
  onInputChange: (input: string) => void;
  onSubmit: () => void;
}

export default function MatrixRPGTerminal({
  content, gameState, userInput, isProcessing, onInputChange, onSubmit
}: Props) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // No need to reserve space for input since it's now rendered in canvas
      setDimensions({
        width: rect.width,
        height: rect.height
      });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="matrix-rpg-terminal" ref={containerRef}>
      <MatrixRPGCanvas
        content={content}
        width={dimensions.width}
        height={dimensions.height}
        gameState={gameState}
        userInput={userInput}
        isProcessing={isProcessing}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}
