import { GameState } from './types';

interface Props {
  gameState: GameState;
}

export default function MatrixRPGHeader({ gameState }: Props) {
  const getStatusText = () => {
    switch (gameState) {
      case 'initializing':
        return 'INIT';
      case 'loading':
        return 'BOOT';
      case 'ready':
        return 'READY';
      case 'interactive':
        return 'ONLINE';
      default:
        return 'IDLE';
    }
  };

  const isActive = gameState === 'ready' || gameState === 'interactive';
  const isLoading = gameState === 'initializing' || gameState === 'loading';

  return (
    <div className="matrix-rpg-header">
      {/* Brand/Logo section - mimics vintage monitor branding */}
      <div className="matrix-rpg-brand">
        <span className="matrix-rpg-brand-logo">SYNAPTIC</span>
        <span className="matrix-rpg-model">NX-3700</span>
      </div>

      {/* Center display - digital readout style */}
      <div className="matrix-rpg-title">
        NEURAL INTERFACE • PROJECT MIRROR
      </div>

      {/* Control panel section */}
      <div className="matrix-rpg-controls">
        <div className="matrix-rpg-sys-info">
          <span className="matrix-rpg-node">SYS.37912</span>
          <div 
            className={`matrix-rpg-power-led ${isLoading ? 'standby' : ''}`}
            title={isActive ? 'System Online' : 'Initializing...'}
          />
          <span className={`matrix-rpg-status ${isActive ? 'critical' : ''}`}>
            {getStatusText()}
          </span>
        </div>
      </div>
    </div>
  );
}
