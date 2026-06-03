import { useEffect, useRef, useState, useCallback } from 'react';
import './NeuralNexus.css';
import { Node, Particle, ScorePopup, DEFAULT_SETTINGS, CanvasProps, GameSettings } from './types';

// Game state interface
interface GameState {
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

interface CanvasSize {
  width: number;
  height: number;
  dpr: number;
}

interface Difficulty {
  level: number;
  effectiveNodeCount: number;
  maxVelocity: number;
  randomMovement: number;
  scoringRange: number;
  pulseIntensity: number;
  scoreMultiplierBonus: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const isValidCanvasSize = ({ width, height }: CanvasSize) => Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;

function getDifficulty(level: number, settings: GameSettings): Difficulty {
  const cappedLevel = clamp(level, 1, settings.MAX_DIFFICULTY_LEVEL);
  const progress = cappedLevel - 1;

  return {
    level: cappedLevel,
    effectiveNodeCount: Math.min(settings.NODE_COUNT + progress, settings.MAX_NODE_COUNT),
    maxVelocity: Math.min(settings.MAX_VELOCITY + progress * 0.04, settings.MAX_VELOCITY_CAP),
    randomMovement: settings.RANDOM_MOVEMENT * (1 + progress * 0.08),
    scoringRange: Math.max(settings.SCORING_RANGE - progress * 2, settings.MIN_SCORING_RANGE),
    pulseIntensity: Math.min(1 + progress * 0.08, 1.6),
    scoreMultiplierBonus: 1 + progress * 0.03,
  };
}

export default function NeuralNexus({ className = '', width, height }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasSizeRef = useRef<CanvasSize>({ width: 0, height: 0, dpr: 1 });
  const animationRef = useRef<number>();
  const pendingResizeFrameRef = useRef<number>();
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const nodesRef = useRef<Node[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scorePopupsRef = useRef<ScorePopup[]>([]);
  const lastScoreTimeRef = useRef(0);
  const gameStateRef = useRef<GameState>();
  const isActiveRef = useRef(false);
  const isPausedRef = useRef(false);
  const persistedHighScoreRef = useRef(0);
  const persistedMaxComboRef = useRef(0);
  const settings = DEFAULT_SETTINGS;
  
  // Game state
  const [gameState, setGameState] = useState<GameState>(() => {
    const highScore = parseInt(localStorage.getItem('neuralNexusHighScore') || '0', 10);
    const maxCombo = parseInt(localStorage.getItem('neuralNexusMaxCombo') || '0', 10);
    persistedHighScoreRef.current = highScore;
    persistedMaxComboRef.current = maxCombo;

    return {
      score: 0,
      highScore,
      combo: 0,
      maxCombo,
      level: 1,
      timeElapsed: 0,
      isActive: false,
      isPaused: false,
      nodesInZone: 0,
    };
  });

  const [showTutorial, setShowTutorial] = useState(true);

  // Sync refs so the animation loop reads latest values without re-running the effect
  useEffect(() => {
    gameStateRef.current = gameState;
    isActiveRef.current = gameState.isActive;
    isPausedRef.current = gameState.isPaused;
  }, [gameState]);

  useEffect(() => {
    if (gameState.highScore > persistedHighScoreRef.current) {
      localStorage.setItem('neuralNexusHighScore', gameState.highScore.toString());
      persistedHighScoreRef.current = gameState.highScore;
    }
  }, [gameState.highScore]);

  useEffect(() => {
    if (gameState.maxCombo > persistedMaxComboRef.current) {
      localStorage.setItem('neuralNexusMaxCombo', gameState.maxCombo.toString());
      persistedMaxComboRef.current = gameState.maxCombo;
    }
  }, [gameState.maxCombo]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActiveRef.current && !isPausedRef.current) {
        setGameState(prev => ({ ...prev, isPaused: true }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
    };
  }, []);

  const createNode = useCallback((id: number, canvasWidth: number, canvasHeight: number): Node => ({
    id,
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    z: Math.random() * 100,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    vz: (Math.random() - 0.5) * 0.2,
    radius: Math.random() * 4 + 3,
    connections: [],
    activity: 0,
    pulse: 0,
    type: id < 6 ? 'input' : id < 12 ? 'hidden' : 'output',
    isScoring: false,
    scoreMultiplier: 1,
  }), []);

  const connectNodes = useCallback(() => {
    nodesRef.current.forEach((node) => {
      node.connections = [];
    });

    nodesRef.current.forEach((node, i) => {
      nodesRef.current.forEach((_, j) => {
        if (i !== j && Math.random() > 0.82) {
          node.connections.push(j);
        }
      });
    });
  }, []);

  // Initialize nodes
  const initNodes = useCallback((canvasWidth: number, canvasHeight: number, nodeCount = settings.NODE_COUNT) => {
    nodesRef.current = Array.from({ length: nodeCount }, (_, i) => createNode(i, canvasWidth, canvasHeight));

    // Create connections
    connectNodes();
  }, [connectNodes, createNode, settings.NODE_COUNT]);

  // Initialize particles
  const initParticles = useCallback((canvasWidth: number, canvasHeight: number) => {
    particlesRef.current = Array.from({ length: Math.min(settings.PARTICLE_COUNT, settings.MAX_PARTICLES) }, () => ({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      z: Math.random() * 50,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      vz: (Math.random() - 0.5) * 0.1,
      life: Math.random(),
      size: Math.random() * 1.5 + 0.5,
      type: 'ambient' as const,
      color: ['rgba(99, 102, 241, 0.3)', 'rgba(168, 85, 247, 0.3)', 'rgba(34, 197, 94, 0.3)'][Math.floor(Math.random() * 3)],
    }));
  }, [settings.MAX_PARTICLES, settings.PARTICLE_COUNT]);

  const growNodesToDifficulty = useCallback((difficulty: Difficulty, canvasWidth: number, canvasHeight: number) => {
    if (!Number.isFinite(canvasWidth) || !Number.isFinite(canvasHeight) || canvasWidth <= 0 || canvasHeight <= 0) return;

    const targetCount = Math.min(difficulty.effectiveNodeCount, settings.MAX_NODE_COUNT);
    if (nodesRef.current.length >= targetCount) return;

    const startId = nodesRef.current.length;
    const nodesToAdd = Math.min(targetCount - startId, 2);
    for (let i = 0; i < nodesToAdd; i += 1) {
      nodesRef.current.push(createNode(startId + i, canvasWidth, canvasHeight));
    }
    connectNodes();
  }, [connectNodes, createNode, settings.MAX_NODE_COUNT]);

  const reconcileEntitiesWithinBounds = useCallback((canvasWidth: number, canvasHeight: number) => {
    if (!Number.isFinite(canvasWidth) || !Number.isFinite(canvasHeight) || canvasWidth <= 0 || canvasHeight <= 0) return;

    nodesRef.current.forEach((node) => {
      node.x = clamp(node.x, node.radius, Math.max(node.radius, canvasWidth - node.radius));
      node.y = clamp(node.y, node.radius, Math.max(node.radius, canvasHeight - node.radius));
      node.z = clamp(node.z, 0, 100);
    });

    particlesRef.current.forEach((particle) => {
      particle.x = clamp(particle.x, 0, canvasWidth);
      particle.y = clamp(particle.y, 0, canvasHeight);
      particle.z = clamp(particle.z, 0, 50);
    });

    scorePopupsRef.current = scorePopupsRef.current.filter((popup) => {
      popup.x = clamp(popup.x, 0, canvasWidth);
      popup.y = clamp(popup.y, 0, canvasHeight);
      return popup.life > 0;
    });

    mouseRef.current.x = clamp(mouseRef.current.x, -1000, canvasWidth);
    mouseRef.current.y = clamp(mouseRef.current.y, -1000, canvasHeight);
  }, []);

  const addComboFeedbackParticles = useCallback((x: number, y: number) => {
    const size = canvasSizeRef.current;
    if (!isValidCanvasSize(size) || particlesRef.current.length >= settings.MAX_PARTICLES) return;

    const availableSlots = settings.MAX_PARTICLES - particlesRef.current.length;
    const count = Math.min(settings.COMBO_FEEDBACK_PARTICLES, availableSlots);
    for (let i = 0; i < count; i += 1) {
      particlesRef.current.push({
        x: clamp(x + (Math.random() - 0.5) * 24, 0, size.width),
        y: clamp(y + (Math.random() - 0.5) * 24, 0, size.height),
        z: Math.random() * 30,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        vz: (Math.random() - 0.5) * 0.2,
        life: 0,
        size: Math.random() * 1.6 + 0.8,
        type: 'explosion',
        color: 'rgba(34, 197, 94, 0.3)',
      });
    }
  }, [settings.COMBO_FEEDBACK_PARTICLES, settings.MAX_PARTICLES]);

  // Add score popup
  const addScorePopup = useCallback((x: number, y: number, value: number) => {
    scorePopupsRef.current.push({
      x,
      y,
      value,
      life: 1,
      vy: -1.5,
    });
  }, []);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset game
  const resetGame = useCallback(() => {
    const size = canvasSizeRef.current;
    if (isValidCanvasSize(size)) {
      initNodes(size.width, size.height);
      initParticles(size.width, size.height);
    }
    scorePopupsRef.current = [];
    mouseRef.current = { x: -1000, y: -1000 };
    setGameState(prev => ({
      ...prev,
      score: 0,
      combo: 0,
      level: 1,
      timeElapsed: 0,
      isActive: false,
      isPaused: false,
      nodesInZone: 0,
    }));
    setShowTutorial(true);
  }, [initNodes, initParticles]);

  // Toggle pause
  const togglePause = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  // Game timer
  useEffect(() => {
    if (!gameState.isActive || gameState.isPaused) return;

    const interval = setInterval(() => {
      setGameState(prev => ({ ...prev, timeElapsed: prev.timeElapsed + 1 }));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.isActive, gameState.isPaused]);

  // Main game effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size from the container content box, let CSS handle display size
    const measureCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return false;
      const contentWidth = container.clientWidth;
      const contentHeight = container.clientHeight;

      if (!Number.isFinite(contentWidth) || !Number.isFinite(contentHeight) || contentWidth <= 0 || contentHeight <= 0) {
        return false;
      }

      const dpr = window.devicePixelRatio || 1;
      const bufferWidth = Math.round(contentWidth * dpr);
      const bufferHeight = Math.round(contentHeight * dpr);
      const previousSize = canvasSizeRef.current;

      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const nextSize = {
        width: bufferWidth / dpr,
        height: bufferHeight / dpr,
        dpr,
      };
      canvasSizeRef.current = nextSize;

      if (!isValidCanvasSize(previousSize)) {
        initNodes(nextSize.width, nextSize.height);
        initParticles(nextSize.width, nextSize.height);
      } else {
        reconcileEntitiesWithinBounds(nextSize.width, nextSize.height);
      }

      return true;
    };

    const scheduleCanvasMeasurement = () => {
      if (pendingResizeFrameRef.current) return;
      pendingResizeFrameRef.current = requestAnimationFrame(() => {
        pendingResizeFrameRef.current = undefined;
        measureCanvasSize();
      });
    };

    measureCanvasSize();
    const resizeObserver = new ResizeObserver(scheduleCanvasMeasurement);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    window.addEventListener('resize', scheduleCanvasMeasurement);

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const size = canvasSizeRef.current;
      mouseRef.current.x = clamp(e.clientX - rect.left, 0, size.width);
      mouseRef.current.y = clamp(e.clientY - rect.top, 0, size.height);
      
      if (!isActiveRef.current) {
        setGameState(prev => ({ ...prev, isActive: true }));
        setShowTutorial(false);
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    // Touch support
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const size = canvasSizeRef.current;
      mouseRef.current.x = clamp(touch.clientX - rect.left, 0, size.width);
      mouseRef.current.y = clamp(touch.clientY - rect.top, 0, size.height);
      
      if (!isActiveRef.current) {
        setGameState(prev => ({ ...prev, isActive: true }));
        setShowTutorial(false);
      }
    };

    const handleTouchEnd = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    // Animation loop
    const animate = (time: number) => {
      const { width: drawWidth, height: drawHeight } = canvasSizeRef.current;
      if (!drawWidth || !drawHeight) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (isPausedRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const difficulty = getDifficulty(gameStateRef.current?.level ?? 1, settings);

      ctx.clearRect(0, 0, drawWidth, drawHeight);
      
      // Create gradient background
      const gradient = ctx.createRadialGradient(
        drawWidth / 2, drawHeight / 2, 0,
        drawWidth / 2, drawHeight / 2, Math.max(drawWidth, drawHeight) / 2
      );
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
      gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.03)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, drawWidth, drawHeight);

      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      
      // Draw cursor zones with enhanced visuals
      if (mouseX >= 0 && mouseY >= 0) {
        // Outer glow
        const outerGlow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, settings.ATTRACTION_RANGE);
        outerGlow.addColorStop(0, 'rgba(99, 102, 241, 0.05)');
        outerGlow.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, settings.ATTRACTION_RANGE, 0, Math.PI * 2);
        ctx.fill();

        // Scoring zone (animated)
        const progressRatio = Math.min((gameStateRef.current?.nodesInZone ?? 0) / settings.COMBO_THRESHOLD, 1);
        const pulseScale = 1 + Math.sin(time * 0.003) * 0.05 * difficulty.pulseIntensity;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, difficulty.scoringRange * pulseScale, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 197, 94, ${0.35 + progressRatio * 0.25})`;
        ctx.lineWidth = 2 + progressRatio;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Danger zone (pulsing)
        const dangerPulse = 1 + Math.sin(time * 0.008) * 0.1;
        const dangerGradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, settings.DANGER_ZONE * dangerPulse);
        dangerGradient.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
        dangerGradient.addColorStop(0.7, 'rgba(239, 68, 68, 0.1)');
        dangerGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = dangerGradient;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, settings.DANGER_ZONE * dangerPulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Cursor crosshair
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mouseX - 8, mouseY);
        ctx.lineTo(mouseX + 8, mouseY);
        ctx.moveTo(mouseX, mouseY - 8);
        ctx.lineTo(mouseX, mouseY + 8);
        ctx.stroke();
      }

      // Update and track scoring nodes
      let scoringNodesCount = 0;
      let frameScore = 0;

      // Update nodes with game physics
      nodesRef.current.forEach((node, i) => {
        const distToCursor = mouseX >= 0 && mouseY >= 0 ? 
          Math.sqrt((mouseX - node.x) ** 2 + (mouseY - node.y) ** 2) : 
          Infinity;
        const insideCursorArea = distToCursor <= settings.ATTRACTION_RANGE;
        
        // === NODE AWARENESS: Detect nearby nodes ===
        let closeNodesCount = 0;
        const avgCloseNodeDir = { x: 0, y: 0 };
        let minDistToOther = Infinity;
        
        nodesRef.current.forEach((otherNode, j) => {
          if (i === j) return;
          
          const dx = otherNode.x - node.x;
          const dy = otherNode.y - node.y;
          const dz = otherNode.z - node.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < settings.NODE_AWARENESS_RANGE && distance > 0) {
            closeNodesCount++;
            avgCloseNodeDir.x += dx / distance;
            avgCloseNodeDir.y += dy / distance;
            
            if (distance < minDistToOther) {
              minDistToOther = distance;
            }
          }
        });
        
        // Normalize average direction
        if (closeNodesCount > 0) {
          const mag = Math.sqrt(avgCloseNodeDir.x ** 2 + avgCloseNodeDir.y ** 2);
          if (mag > 0) {
            avgCloseNodeDir.x /= mag;
            avgCloseNodeDir.y /= mag;
          }
        }
        
        // === SMART RANDOM MOVEMENT: Avoid moving toward close nodes ===
        let randomX = (Math.random() - 0.5) * difficulty.randomMovement;
        let randomY = (Math.random() - 0.5) * difficulty.randomMovement;
        const randomZ = (Math.random() - 0.5) * difficulty.randomMovement * 0.5;
        
        // If there are close nodes, bias random movement away from them
        if (closeNodesCount > 0 && minDistToOther < settings.MIN_NODE_DISTANCE * 1.5) {
          // Strong bias away from cluster center
          randomX -= avgCloseNodeDir.x * difficulty.randomMovement * 2;
          randomY -= avgCloseNodeDir.y * difficulty.randomMovement * 2;
        }
        
        node.vx += randomX;
        node.vy += randomY;
        node.vz += randomZ;
        
        // === NODE-TO-NODE REPULSION: Keep minimum distance ===
        nodesRef.current.forEach((otherNode, j) => {
          if (i === j) return;
          
          const dx = otherNode.x - node.x;
          const dy = otherNode.y - node.y;
          const dz = otherNode.z - node.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance > 0 && distance < settings.MIN_NODE_DISTANCE) {
            // Strong repulsion when too close - inverse square law
            const overlap = settings.MIN_NODE_DISTANCE - distance;
            const force = settings.NODE_REPULSION_FORCE * (overlap / settings.MIN_NODE_DISTANCE) ** 2;
            
            node.vx -= (dx / distance) * force;
            node.vy -= (dy / distance) * force;
            node.vz -= (dz / distance) * force * 0.3;
          }
        });
        
        // === CLUSTER EXPLOSION: Explosive repulsion when clustered outside cursor ===
        if (!insideCursorArea && closeNodesCount >= settings.CLUSTER_THRESHOLD) {
          // Calculate explosion force based on cluster density
          const clusterDensity = closeNodesCount / settings.CLUSTER_THRESHOLD;
          const explosionForce = settings.CLUSTER_EXPLOSION_FORCE * clusterDensity;
          
          // Apply explosive force away from cluster center
          node.vx -= avgCloseNodeDir.x * explosionForce;
          node.vy -= avgCloseNodeDir.y * explosionForce;
          
          // Add some randomness to explosion for more dynamic movement
          node.vx += (Math.random() - 0.5) * explosionForce * 0.3;
          node.vy += (Math.random() - 0.5) * explosionForce * 0.3;
        }
        
        // === Edge distance maximization when outside cursor areas ===
        if (!insideCursorArea) {
          nodesRef.current.forEach((otherNode, j) => {
            if (i === j) return;
            
            const isConnected = node.connections.includes(j) || otherNode.connections.includes(i);
            
            if (isConnected) {
              const dx = otherNode.x - node.x;
              const dy = otherNode.y - node.y;
              const dz = otherNode.z - node.z;
              const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
              
              if (distance > 0) {
                const clampedDistance = Math.max(
                  settings.EDGE_MIN_DISTANCE,
                  Math.min(distance, settings.EDGE_MAX_DISTANCE)
                );
                
                const distanceFactor = 1.0 - (
                  (clampedDistance - settings.EDGE_MIN_DISTANCE) / 
                  (settings.EDGE_MAX_DISTANCE - settings.EDGE_MIN_DISTANCE)
                );
                
                const force = settings.EDGE_REPULSION * distanceFactor * settings.OUTSIDE_BOOST;
                
                node.vx -= (dx / distance) * force;
                node.vy -= (dy / distance) * force;
                node.vz -= (dz / distance) * force;
              }
            }
          });
        }
        
        // === Handle mouse interaction ===
        if (mouseX >= 0 && mouseY >= 0) {
          const dx = mouseX - node.x;
          const dy = mouseY - node.y;
          
          if (distToCursor < settings.REPULSION_RANGE) {
            // Strong repulsion in danger zone
            const force = settings.REPULSION_FORCE * (1 - distToCursor / settings.REPULSION_RANGE);
            node.vx -= (dx / distToCursor) * force;
            node.vy -= (dy / distToCursor) * force;
            node.activity = 1;
          } else if (distToCursor < settings.ATTRACTION_RANGE) {
            // Attraction in safe zone
            const force = settings.ATTRACTION_FORCE * (1 - distToCursor / settings.ATTRACTION_RANGE);
            node.vx += (dx / distToCursor) * force;
            node.vy += (dy / distToCursor) * force;
            node.activity = Math.min(1, 0.3 + (1 - distToCursor / settings.ATTRACTION_RANGE) * 0.7);
          } else if (distToCursor > settings.REJECTION_RANGE) {
            // Rejection when far away
            const force = settings.REJECTION_FORCE;
            node.vx -= (dx / distToCursor) * force;
            node.vy -= (dy / distToCursor) * force;
            node.activity = Math.max(0, node.activity - 0.02);
          } else {
            node.activity = Math.max(0, node.activity - 0.01);
          }

          // Check scoring
          if (distToCursor <= difficulty.scoringRange && distToCursor > settings.DANGER_ZONE) {
            const proximity = 1 - (distToCursor / difficulty.scoringRange);
            const points = Math.floor(proximity * 10 * node.scoreMultiplier * difficulty.scoreMultiplierBonus);
            frameScore += points;
            node.isScoring = true;
            scoringNodesCount++;
          } else {
            node.isScoring = false;
          }
        } else {
          node.activity = Math.max(0, node.activity - 0.01);
          node.isScoring = false;
        }
        
        // Apply velocity decay
        node.vx *= settings.VELOCITY_DECAY;
        node.vy *= settings.VELOCITY_DECAY;
        node.vz *= settings.VELOCITY_DECAY;
        
        // Clamp velocity
        const speed = Math.sqrt(node.vx ** 2 + node.vy ** 2 + node.vz ** 2);
        if (speed > difficulty.maxVelocity) {
          const ratio = difficulty.maxVelocity / speed;
          node.vx *= ratio;
          node.vy *= ratio;
          node.vz *= ratio;
        } else if (speed < settings.MIN_VELOCITY) {
          const ratio = settings.MIN_VELOCITY / Math.max(0.01, speed);
          node.vx *= ratio;
          node.vy *= ratio;
          node.vz *= ratio;
        }
        
        // Update position
        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;
        
        // Update pulse
        node.pulse = Math.sin(time * 0.005 + i) * 0.5 + 0.5;
        
        // Bounce off edges
        if (node.x < node.radius || node.x > drawWidth - node.radius) {
          node.vx *= -0.8;
          node.x = clamp(node.x, node.radius, Math.max(node.radius, drawWidth - node.radius));
        }
        if (node.y < node.radius || node.y > drawHeight - node.radius) {
          node.vy *= -0.8;
          node.y = clamp(node.y, node.radius, Math.max(node.radius, drawHeight - node.radius));
        }
        if (node.z < 0 || node.z > 100) {
          node.vz *= -0.8;
          node.z = Math.max(0, Math.min(100, node.z));
        }
      });

      // Update score with combo system
      if (frameScore > 0 && time - lastScoreTimeRef.current > 100) {
        lastScoreTimeRef.current = time;
        const currentState = gameStateRef.current ?? {
          score: 0,
          highScore: 0,
          combo: 0,
          maxCombo: 0,
          level: 1,
          timeElapsed: 0,
          isActive: false,
          isPaused: false,
          nodesInZone: 0,
        };
        const nextComboForFeedback = scoringNodesCount >= settings.COMBO_THRESHOLD ? currentState.combo + 1 : 0;
        const comboMultiplierForFeedback = Math.floor(nextComboForFeedback / 10) + 1;
        const finalScoreForFeedback = currentState.score + frameScore * comboMultiplierForFeedback;
        const nextLevelForFeedback = Math.floor(finalScoreForFeedback / settings.LEVEL_UP_SCORE) + 1;

        if (nextLevelForFeedback > currentState.level) {
          growNodesToDifficulty(getDifficulty(nextLevelForFeedback, settings), drawWidth, drawHeight);
        }

        if (scoringNodesCount >= settings.COMBO_THRESHOLD && currentState.nodesInZone < settings.COMBO_THRESHOLD && mouseX >= 0 && mouseY >= 0) {
          addScorePopup(mouseX, mouseY - 48, comboMultiplierForFeedback > 1 ? comboMultiplierForFeedback * 10 : frameScore);
          addComboFeedbackParticles(mouseX, mouseY);
        } else if (frameScore >= 20 && mouseX >= 0 && mouseY >= 0) {
          addScorePopup(mouseX, mouseY - 30, frameScore * comboMultiplierForFeedback);
        }
        
        setGameState(prev => {
          const newCombo = scoringNodesCount >= settings.COMBO_THRESHOLD ? prev.combo + 1 : 0;
          const comboMultiplier = Math.floor(newCombo / 10) + 1;
          const finalScore = prev.score + frameScore * comboMultiplier;
          const newLevel = Math.floor(finalScore / settings.LEVEL_UP_SCORE) + 1;

          return {
            ...prev,
            score: finalScore,
            highScore: Math.max(finalScore, prev.highScore),
            combo: newCombo,
            maxCombo: Math.max(newCombo, prev.maxCombo),
            level: newLevel,
            nodesInZone: scoringNodesCount,
          };
        });
      }

      // Draw connections
      nodesRef.current.forEach((node) => {
        node.connections.forEach((connectionIndex: number) => {
          const connectedNode = nodesRef.current[connectionIndex];
          if (!connectedNode) return;

          const activity = (node.activity + connectedNode.activity) / 2;
          if (activity < 0.15) return;
          
          const lineGradient = ctx.createLinearGradient(node.x, node.y, connectedNode.x, connectedNode.y);
          
          if (node.isScoring && connectedNode.isScoring) {
            lineGradient.addColorStop(0, `rgba(34, 197, 94, ${activity * 0.5})`);
            lineGradient.addColorStop(1, `rgba(34, 197, 94, ${activity * 0.5})`);
          } else {
            lineGradient.addColorStop(0, `rgba(99, 102, 241, ${activity * 0.4})`);
            lineGradient.addColorStop(0.5, `rgba(168, 85, 247, ${activity * 0.3})`);
            lineGradient.addColorStop(1, `rgba(99, 102, 241, ${activity * 0.4})`);
          }
          
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(connectedNode.x, connectedNode.y);
          ctx.strokeStyle = lineGradient;
          ctx.lineWidth = 1 + activity * 2;
          ctx.stroke();
          
          // Add data flow particles on active connections
          if (activity > 0.5 && Math.random() > 0.97) {
            const t = (time * 0.001) % 1;
            const px = node.x + (connectedNode.x - node.x) * t;
            const py = node.y + (connectedNode.y - node.y) * t;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${activity * 0.8})`;
            ctx.fill();
          }
        });
      });

      // Draw nodes with enhanced styling
      nodesRef.current.forEach((node) => {
        const radius = node.radius;
        const brightness = 0.3 + node.activity * 0.7;
        const pulse = node.pulse * 0.2 + 0.8;
        
        // Scoring node special effects
        if (node.isScoring) {
          // Outer glow
          const scoreGlow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 5);
          scoreGlow.addColorStop(0, `rgba(34, 197, 94, ${brightness * 0.3})`);
          scoreGlow.addColorStop(0.5, `rgba(34, 197, 94, ${brightness * 0.1})`);
          scoreGlow.addColorStop(1, 'rgba(34, 197, 94, 0)');
          ctx.fillStyle = scoreGlow;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 5 * pulse, 0, Math.PI * 2);
          ctx.fill();

          // Ring animation
          const ringRadius = radius * 2 + (time * 0.02) % (radius * 3);
          const ringOpacity = 1 - ((ringRadius - radius * 2) / (radius * 3));
          ctx.beginPath();
          ctx.arc(node.x, node.y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(34, 197, 94, ${ringOpacity * 0.5})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        
        // Node glow
        const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 3);
        const glowColor = node.isScoring ? '34, 197, 94' : '99, 102, 241';
        glowGradient.addColorStop(0, `rgba(${glowColor}, ${brightness * 0.5})`);
        glowGradient.addColorStop(1, `rgba(${glowColor}, 0)`);
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 3 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Node core
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * pulse, 0, Math.PI * 2);
        
        let nodeColor;
        if (node.isScoring) {
          nodeColor = `rgba(34, 197, 94, ${brightness})`;
        } else {
          switch (node.type) {
            case 'input':
              nodeColor = `rgba(59, 130, 246, ${brightness})`;
              break;
            case 'output':
              nodeColor = `rgba(168, 85, 247, ${brightness})`;
              break;
            default:
              nodeColor = `rgba(99, 102, 241, ${brightness})`;
          }
        }
        
        ctx.fillStyle = nodeColor;
        ctx.fill();
        
        // Node ring
        ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.7})`;
        ctx.lineWidth = node.isScoring ? 2.5 : 1.5;
        ctx.stroke();
        
        // Inner highlight
        ctx.beginPath();
        ctx.arc(node.x - radius * 0.3, node.y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
        ctx.fill();
      });

      // Update and draw particles
      particlesRef.current.forEach((particle: Particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.z += particle.vz;
        particle.life += 0.008;
        
        if (particle.life > 1) {
          particle.x = Math.random() * drawWidth;
          particle.y = Math.random() * drawHeight;
          particle.z = Math.random() * 50;
          particle.life = 0;
        }
        
        if (particle.x < 0 || particle.x > drawWidth) particle.vx *= -1;
        if (particle.y < 0 || particle.y > drawHeight) particle.vy *= -1;
        if (particle.z < 0 || particle.z > 50) particle.vz *= -1;
        
        const z = 25 + particle.z;
        const scale = 50 / z;
        const size = particle.size * scale;
        const alpha = (1 - particle.life) * 0.4;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace('0.3', alpha.toString());
        ctx.fill();
      });

      // Draw and update score popups
      scorePopupsRef.current = scorePopupsRef.current.filter(popup => {
        popup.y += popup.vy;
        popup.life -= 0.02;
        popup.vy -= 0.02;
        
        if (popup.life <= 0) return false;
        
        ctx.font = `600 ${14 + popup.value / 10}px 'JetBrains Mono', 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(34, 197, 94, ${popup.life})`;
        ctx.shadowColor = 'rgba(34, 197, 94, 0.4)';
        ctx.shadowBlur = 6;
        ctx.fillText(`+${popup.value}`, popup.x, popup.y);
        ctx.shadowBlur = 0;
        
        return true;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleCanvasMeasurement);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      if (pendingResizeFrameRef.current) {
        cancelAnimationFrame(pendingResizeFrameRef.current);
        pendingResizeFrameRef.current = undefined;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, initNodes, initParticles, reconcileEntitiesWithinBounds, growNodesToDifficulty, addScorePopup, addComboFeedbackParticles, settings]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        togglePause();
      }
      if (e.key === 'r' || e.key === 'R') {
        resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause, resetGame]);

  const comboMultiplier = Math.floor(gameState.combo / 10) + 1;

  return (
    <div className={`neural-nexus-game ${gameState.isPaused ? 'paused' : ''}`}>
      {/* Game Header */}
      <div className="neural-nexus-header">
        <div className="neural-nexus-hud">
          <div className="neural-nexus-stat-group">
            <div className="neural-nexus-stat">
              <span className="neural-nexus-stat-indicator score-indicator" />
              <div className="neural-nexus-stat-content">
                <span className="neural-nexus-stat-label">Score</span>
                <span className="neural-nexus-stat-value score">{gameState.score.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="neural-nexus-stat">
              <span className="neural-nexus-stat-indicator best-indicator" />
              <div className="neural-nexus-stat-content">
                <span className="neural-nexus-stat-label">Best</span>
                <span className="neural-nexus-stat-value high-score">{gameState.highScore.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="neural-nexus-stat">
              <span className={`neural-nexus-stat-indicator combo-indicator ${comboMultiplier > 1 ? 'active' : ''}`} />
              <div className="neural-nexus-stat-content">
                <span className="neural-nexus-stat-label">Combo</span>
                <span className={`neural-nexus-stat-value ${comboMultiplier > 1 ? 'combo-active' : ''}`}>
                  x{comboMultiplier}
                </span>
              </div>
            </div>
          </div>
          
          <div className="neural-nexus-stat-group">
            <div className="neural-nexus-stat">
              <span className="neural-nexus-stat-indicator level-indicator" />
              <div className="neural-nexus-stat-content">
                <span className="neural-nexus-stat-label">Level</span>
                <span className="neural-nexus-stat-value level">{gameState.level}</span>
              </div>
            </div>
            
            <div className="neural-nexus-stat">
              <span className="neural-nexus-stat-indicator time-indicator" />
              <div className="neural-nexus-stat-content">
                <span className="neural-nexus-stat-label">Time</span>
                <span className="neural-nexus-stat-value">{formatTime(gameState.timeElapsed)}</span>
              </div>
            </div>
            
            <div className="neural-nexus-controls">
              <button 
                className={`neural-nexus-btn ${gameState.isPaused ? 'active' : ''}`}
                onClick={togglePause}
                title={gameState.isPaused ? 'Resume (P)' : 'Pause (P)'}
                aria-label={gameState.isPaused ? 'Resume' : 'Pause'}
              >
                {gameState.isPaused ? '▶' : '⏸'}
              </button>
              <button 
                className="neural-nexus-btn reset" 
                onClick={resetGame}
                title="Reset (R)"
                aria-label="Reset game"
              >
                ↺
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Game Canvas */}
      <div className="neural-nexus-container">
        <canvas
          ref={canvasRef}
          className={`neural-nexus-canvas ${className}`}
          style={{
            width: width || '100%',
            height: height || '100%',
            cursor: gameState.isPaused ? 'default' : 'crosshair'
          }}
        />
        
        {/* Pause Overlay */}
        {gameState.isPaused && (
          <div className="neural-nexus-overlay" onClick={togglePause}>
            <div className="neural-nexus-overlay-content" onClick={(e) => e.stopPropagation()}>
              <h2>Paused</h2>
              <p>Press <kbd>P</kbd> to resume</p>
              <p>Press <kbd>R</kbd> to restart</p>
              <button className="neural-nexus-resume-btn" onClick={togglePause}>Resume</button>
            </div>
          </div>
        )}
        
        {/* Tutorial Overlay */}
        {showTutorial && !gameState.isActive && (
          <div className="neural-nexus-tutorial">
            <div className="neural-nexus-tutorial-content">
              <h2>Neural Nexus</h2>
              <div className="neural-nexus-tutorial-rules">
                <div className="neural-nexus-rule">
                  <span className="rule-dot green" />
                  <span>Keep nodes in the <strong>green zone</strong> to score points</span>
                </div>
                <div className="neural-nexus-rule">
                  <span className="rule-dot red" />
                  <span>Avoid letting nodes touch the <strong>red zone</strong></span>
                </div>
                <div className="neural-nexus-rule">
                  <span className="rule-dot blue" />
                  <span>Nodes are attracted to your cursor</span>
                </div>
                <div className="neural-nexus-rule">
                  <span className="rule-dot amber" />
                  <span>Keep 3+ nodes scoring for <strong>combo multiplier</strong></span>
                </div>
              </div>
              <p className="neural-nexus-tutorial-start">Move your cursor over the canvas to start</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Game Footer */}
      <div className="neural-nexus-footer">
        <div className="neural-nexus-status-bar">
          <div className="neural-nexus-status-item">
            <span className={`status-dot ${gameState.nodesInZone > 0 ? 'active' : ''}`} />
            <span>Nodes scoring: <strong>{gameState.nodesInZone}/{settings.COMBO_THRESHOLD}</strong></span>
          </div>
          <div className="neural-nexus-status-item">
            <span>Max combo: <strong>x{Math.floor(gameState.maxCombo / 10) + 1}</strong></span>
          </div>
          <div className="neural-nexus-status-item hint">
            <kbd>P</kbd> Pause <span className="separator">·</span> <kbd>R</kbd> Reset
          </div>
        </div>
      </div>
    </div>
  );
}
