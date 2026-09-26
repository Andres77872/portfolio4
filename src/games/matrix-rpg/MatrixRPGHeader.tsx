import type { CrtIntensity, GameState } from './types';
import { getCrtLabel } from './crtLabels';

interface Props {
  gameState: GameState;
  crtIntensity: CrtIntensity;
  isCrtOverridden: boolean;
  fragmentsRecovered: number;
  totalFragments: number;
  mirrorRestored: boolean;
}

export default function MatrixRPGHeader({
  gameState,
  crtIntensity,
  isCrtOverridden,
  fragmentsRecovered,
  totalFragments,
  mirrorRestored,
}: Props) {
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

      <div className="matrix-rpg-title">
        <span className="matrix-rpg-title-prefix">NEURAL INTERFACE • </span>PROJECT MIRROR
      </div>

      <div className="matrix-rpg-controls">
        <div className="matrix-rpg-sys-info">
          <span className="matrix-rpg-node">SYS.37912</span>
          {isActive && (
            <span
              className={`matrix-rpg-mirror ${mirrorRestored ? 'matrix-rpg-mirror--restored' : ''}`}
              title={mirrorRestored ? 'PROJECT MIRROR restored' : 'Memory fragments recovered'}
            >
              MIRROR:{mirrorRestored ? 'OK' : `${fragmentsRecovered}/${totalFragments}`}
            </span>
          )}
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
