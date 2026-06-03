import type { CrtIntensity, GameState } from './types';

interface Props {
  gameState: GameState;
  crtIntensity: CrtIntensity;
  isCrtOverridden: boolean;
}

const getCrtLabel = (intensity: CrtIntensity) => {
  switch (intensity) {
    case 0:
      return 'OFF';
    case 1:
      return 'SOBER';
    case 2:
      return 'SCREEN';
    case 3:
      return 'ARCADE';
  }
};

export default function MatrixRPGHeader({ gameState, crtIntensity, isCrtOverridden }: Props) {
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
    }
  };

  const isActive = gameState === 'ready' || gameState === 'interactive';
  const isLoading = gameState === 'initializing' || gameState === 'loading';

  return (
    <div className="matrix-rpg-header">
      <div className="matrix-rpg-brand">
        <span className="matrix-rpg-brand-logo">SYNAPTIC</span>
        <span className="matrix-rpg-model">NX-3700</span>
      </div>

      <div className="matrix-rpg-title">NEURAL INTERFACE • PROJECT MIRROR</div>

      <div className="matrix-rpg-controls">
        <div className="matrix-rpg-sys-info">
          <span className="matrix-rpg-node">SYS.37912</span>
          <span
            className={`matrix-rpg-crt-indicator matrix-rpg-crt-indicator--${crtIntensity}`}
            title={isCrtOverridden ? 'CRT reduced by OS accessibility preference' : 'CRT intensity'}
          >
            CRT:{getCrtLabel(crtIntensity)}
          </span>
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
