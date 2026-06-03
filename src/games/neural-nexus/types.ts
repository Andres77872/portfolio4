// Type definitions for Neural Nexus game

export interface Node {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  connections: number[];
  activity: number;
  pulse: number;
  type: 'input' | 'hidden' | 'output';
  isScoring: boolean;
  scoreMultiplier: number;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  size: number;
  type: 'trail' | 'explosion' | 'ambient';
  color: string;
}

export interface ScorePopup {
  x: number;
  y: number;
  value: number;
  life: number;
  vy: number;
}

export interface GameState {
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
  level: number;
  timeElapsed: number;
  isActive: boolean;
  isPaused: boolean;
  nodesInZone: number;
}

export interface GameSettings {
  // Cursor zones
  ATTRACTION_RANGE: number;
  REPULSION_RANGE: number;
  DANGER_ZONE: number;
  SCORING_RANGE: number;
  REJECTION_RANGE: number;
  
  // Physics forces
  ATTRACTION_FORCE: number;
  REPULSION_FORCE: number;
  REJECTION_FORCE: number;
  RANDOM_MOVEMENT: number;
  EDGE_REPULSION: number;
  
  // Node-to-node interaction
  MIN_NODE_DISTANCE: number;       // Minimum distance between nodes
  NODE_REPULSION_FORCE: number;    // Base repulsion between close nodes
  NODE_AWARENESS_RANGE: number;    // Range to detect nearby nodes
  CLUSTER_THRESHOLD: number;       // Number of close nodes to trigger explosion
  CLUSTER_EXPLOSION_FORCE: number; // Explosive repulsion when clustered
  
  // Distance thresholds
  EDGE_MIN_DISTANCE: number;
  EDGE_MAX_DISTANCE: number;
  OUTSIDE_BOOST: number;
  
  // Velocity limits
  MAX_VELOCITY: number;
  MIN_VELOCITY: number;
  VELOCITY_DECAY: number;
  
  // Game config
  NODE_COUNT: number;
  PARTICLE_COUNT: number;
  COMBO_THRESHOLD: number;
  LEVEL_UP_SCORE: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  ATTRACTION_RANGE: 120,
  REPULSION_RANGE: 35,
  DANGER_ZONE: 25,
  SCORING_RANGE: 80,
  REJECTION_RANGE: 200,
  
  ATTRACTION_FORCE: 0.018,
  REPULSION_FORCE: 0.1,
  REJECTION_FORCE: 0.005,
  RANDOM_MOVEMENT: 0.002,
  EDGE_REPULSION: 0.002,
  
  // Node-to-node interaction - NEW
  MIN_NODE_DISTANCE: 25,           // Nodes keep at least 25px apart
  NODE_REPULSION_FORCE: 0.08,      // Strong repulsion when too close
  NODE_AWARENESS_RANGE: 60,        // Detect nodes within 60px
  CLUSTER_THRESHOLD: 3,            // 3+ close nodes = explosion
  CLUSTER_EXPLOSION_FORCE: 0.25,   // Explosive burst when clustered
  
  EDGE_MIN_DISTANCE: 50,
  EDGE_MAX_DISTANCE: 200,
  OUTSIDE_BOOST: 2.5,
  
  MAX_VELOCITY: 0.7,
  MIN_VELOCITY: 0.05,
  VELOCITY_DECAY: 0.97,
  
  NODE_COUNT: 18,
  PARTICLE_COUNT: 25,
  COMBO_THRESHOLD: 3,
  LEVEL_UP_SCORE: 500,
};

export interface CanvasProps {
  className?: string;
  width?: number;
  height?: number;
}
