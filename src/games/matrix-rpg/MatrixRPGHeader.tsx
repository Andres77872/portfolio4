import { GameState } from './types';

interface Props {
  gameState: GameState;
}

export default function MatrixRPGHeader({ gameState }: Props) {
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

      <div className="matrix-rpg-sys-info">
        <span>NODE-37912</span>
        <span className={`matrix-rpg-status ${getStatusClass()}`}>
          {getStatusText()}
        </span>
      </div>
    </div>
  );
}
