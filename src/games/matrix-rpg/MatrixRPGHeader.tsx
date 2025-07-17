import { GameState } from './types';

interface Props {
  gameState: GameState;
  loadingProgress: number;
}

export default function MatrixRPGHeader({ gameState, loadingProgress }: Props) {
  const getStatusText = () => {
    switch (gameState) {
      case 'initializing':
        return 'INITIALIZING';
      case 'loading':
        return 'LOADING';
      case 'ready':
        return 'READY';
      case 'interactive':
        return 'ACTIVE';
      default:
        return 'STANDBY';
    }
  };

  const getStatusClass = () => {
    switch (gameState) {
      case 'ready':
      case 'interactive':
        return 'critical';
      default:
        return '';
    }
  };

  return (
    <div className="matrix-rpg-header">
      <div className="matrix-rpg-title">
        SYNAPTIC NEURAL INTERFACE - PROJECT MIRROR
      </div>

      {gameState === 'loading' && (
        <div className="matrix-rpg-progress-container">
          <div
            className="matrix-rpg-progress-bar"
            style={{width: `${loadingProgress}%`}}
          />
          <div className="matrix-rpg-progress-text">
            {Math.floor(loadingProgress)}%
          </div>
        </div>
      )}

      <div className="matrix-rpg-sys-info">
        <span>NODE-37912</span>
        <span className={`matrix-rpg-status ${getStatusClass()}`}>
          {getStatusText()}
        </span>
      </div>
    </div>
  );
}
