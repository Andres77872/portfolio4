import { useEffect, useRef, useState, useCallback } from 'react';
import './NeuralNexus.css';
import { Node, Particle, ScorePopup, DEFAULT_SETTINGS, CanvasProps } from './types';

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

export default function NeuralNexus({ className = '', width, height }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const nodesRef = useRef<Node[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scorePopupsRef = useRef<ScorePopup[]>([]);
  const lastScoreTimeRef = useRef(0);
  const isActiveRef = useRef(false);
  const isPausedRef = useRef(false);
  const settings = DEFAULT_SETTINGS;
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    highScore: parseInt(localStorage.getItem('neuralNexusHighScore') || '0', 10),
    combo: 0,
    maxCombo: parseInt(localStorage.getItem('neuralNexusMaxCombo') || '0', 10),
    level: 1,
    timeElapsed: 0,
    isActive: false,
    isPaused: false,
    nodesInZone: 0,
  });

  const [showTutorial, setShowTutorial] = useState(true);

  // Sync refs so the animation loop reads latest values without re-running the effect
  useEffect(() => { isActiveRef.current = gameState.isActive; }, [gameState.isActive]);
  useEffect(() => { isPausedRef.current = gameState.isPaused; }, [gameState.isPaused]);

  // Initialize nodes
  const initNodes = useCallback((canvasWidth: number, canvasHeight: number) => {
    nodesRef.current = Array.from({ length: settings.NODE_COUNT }, (_, i) => ({
      id: i,
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
      type: i < 6 ? 'input' : i < 12 ? 'hidden' : 'output',
      isScoring: false,
      scoreMultiplier: 1,
    }));

    // Create connections
    nodesRef.current.forEach((node, i) => {
      nodesRef.current.forEach((_, j) => {
        if (i !== j && Math.random() > 0.82) {
          node.connections.push(j);
        }
      });
    });
  }, [settings.NODE_COUNT]);

  // Initialize particles
  const initParticles = useCallback((canvasWidth: number, canvasHeight: number) => {
    particlesRef.current = Array.from({ length: settings.PARTICLE_COUNT }, () => ({
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
  }, [settings.PARTICLE_COUNT]);

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
    const canvas = canvasRef.current;
    if (canvas) {
      initNodes(canvas.offsetWidth, canvas.offsetHeight);
      initParticles(canvas.offsetWidth, canvas.offsetHeight);
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

    // Set canvas size — read from container, let CSS handle display size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    initNodes(canvas.offsetWidth, canvas.offsetHeight);
    initParticles(canvas.offsetWidth, canvas.offsetHeight);

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      
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
      mouseRef.current.x = touch.clientX - rect.left;
      mouseRef.current.y = touch.clientY - rect.top;
      
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
      if (isPausedRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      
      // Create gradient background
      const gradient = ctx.createRadialGradient(
        canvas.offsetWidth / 2, canvas.offsetHeight / 2, 0,
        canvas.offsetWidth / 2, canvas.offsetHeight / 2, Math.max(canvas.offsetWidth, canvas.offsetHeight) / 2
      );
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
      gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.03)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

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
        const pulseScale = 1 + Math.sin(time * 0.003) * 0.05;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, settings.SCORING_RANGE * pulseScale, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.lineWidth = 2;
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
        let randomX = (Math.random() - 0.5) * settings.RANDOM_MOVEMENT;
        let randomY = (Math.random() - 0.5) * settings.RANDOM_MOVEMENT;
        const randomZ = (Math.random() - 0.5) * settings.RANDOM_MOVEMENT * 0.5;
        
        // If there are close nodes, bias random movement away from them
        if (closeNodesCount > 0 && minDistToOther < settings.MIN_NODE_DISTANCE * 1.5) {
          // Strong bias away from cluster center
          randomX -= avgCloseNodeDir.x * settings.RANDOM_MOVEMENT * 2;
          randomY -= avgCloseNodeDir.y * settings.RANDOM_MOVEMENT * 2;
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
          if (distToCursor <= settings.SCORING_RANGE && distToCursor > settings.DANGER_ZONE) {
            const proximity = 1 - (distToCursor / settings.SCORING_RANGE);
            const points = Math.floor(proximity * 10 * node.scoreMultiplier);
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
        if (speed > settings.MAX_VELOCITY) {
          const ratio = settings.MAX_VELOCITY / speed;
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
        if (node.x < node.radius || node.x > canvas.offsetWidth - node.radius) {
          node.vx *= -0.8;
          node.x = Math.max(node.radius, Math.min(canvas.offsetWidth - node.radius, node.x));
        }
        if (node.y < node.radius || node.y > canvas.offsetHeight - node.radius) {
          node.vy *= -0.8;
          node.y = Math.max(node.radius, Math.min(canvas.offsetHeight - node.radius, node.y));
        }
        if (node.z < 0 || node.z > 100) {
          node.vz *= -0.8;
          node.z = Math.max(0, Math.min(100, node.z));
        }
      });

      // Update score with combo system
      if (frameScore > 0 && time - lastScoreTimeRef.current > 100) {
        lastScoreTimeRef.current = time;
        
        setGameState(prev => {
          const newCombo = scoringNodesCount >= settings.COMBO_THRESHOLD ? prev.combo + 1 : 0;
          const comboMultiplier = Math.floor(newCombo / 10) + 1;
          const finalScore = prev.score + frameScore * comboMultiplier;
          const newLevel = Math.floor(finalScore / settings.LEVEL_UP_SCORE) + 1;
          
          if (finalScore > prev.highScore) {
            localStorage.setItem('neuralNexusHighScore', finalScore.toString());
          }
          if (newCombo > prev.maxCombo) {
            localStorage.setItem('neuralNexusMaxCombo', newCombo.toString());
          }

          // Add score popup for significant scores
          if (frameScore >= 20 && mouseX >= 0 && mouseY >= 0) {
            addScorePopup(mouseX, mouseY - 30, frameScore * comboMultiplier);
          }

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
          particle.x = Math.random() * canvas.offsetWidth;
          particle.y = Math.random() * canvas.offsetHeight;
          particle.z = Math.random() * 50;
          particle.life = 0;
        }
        
        if (particle.x < 0 || particle.x > canvas.offsetWidth) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.offsetHeight) particle.vy *= -1;
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
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, initNodes, initParticles, addScorePopup, settings]);

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
            <span>Nodes scoring: <strong>{gameState.nodesInZone}</strong></span>
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
