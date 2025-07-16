import React from 'react';
import { GameState } from './types';

interface Props {
  gameState: GameState;
  loadingProgress: number;
}

export default function MatrixRPGHeader({ gameState, loadingProgress }: Props) {
  return (
    <div className="matrix-rpg-header">
      <div className="matrix-rpg-hud">
        <div className="matrix-rpg-title">
          PROJECT MIRROR - Neural Interface Terminal
        </div>
        {gameState === 'loading' && (
          <div className="matrix-rpg-progress-container">
            <div 
              className="matrix-rpg-progress-bar"
              style={{width: `${loadingProgress}%`}}
            ></div>
            <div className="matrix-rpg-progress-text">
              LOADING: {Math.floor(loadingProgress)}%
            </div>
          </div>
        )}
        <div className="matrix-rpg-sys-info">
          <span>SYS.37912</span>
          <span className="matrix-rpg-status">
            STATUS: {gameState === 'ready' ? 'CRITICAL' : 'CONNECTING'}
          </span>
        </div>
      </div>
    </div>
  );
} 