import { useEffect, useRef, useState } from 'react';
import './NeuralNexus.css';

// Type definitions
interface AINode {
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
  isScoring: boolean; // New: tracks if node is contributing to score
}

interface AIParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  size: number;
  type: number;
}

interface AICanvasProps {
  className?: string;
  width?: number;
  height?: number;
}

// Game constants
const GAME_SETTINGS = {
  ATTRACTION_RANGE: 120,    // Distance within which nodes are attracted to cursor
  REPULSION_RANGE: 35,      // Distance within which nodes are repelled from cursor
  DANGER_ZONE: 25,          // Distance that counts as "touching" the cursor
  SCORING_RANGE: 80,        // Distance within which nodes contribute to score
  ATTRACTION_FORCE: 0.015,  // Force of attraction
  REPULSION_FORCE: 0.08,    // Force of repulsion (stronger to prevent touching)
  REJECTION_RANGE: 200,     // Distance beyond which nodes are rejected
  REJECTION_FORCE: 0.005    // Force of rejection when too far
};

export default function NeuralNexus({ className = '', width, height }: AICanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: -1000, y: -1000 }); // Start off-screen
  const nodesRef = useRef<AINode[]>([]);
  const particlesRef = useRef<AIParticle[]>([]);
  
  // Game state
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('aiCanvasHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameTime, setGameTime] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize neural network nodes
    const initNodes = () => {
      nodesRef.current = Array.from({ length: 15 }, (_, i) => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        z: Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 4 + 3,
        connections: [],
        activity: 0,
        pulse: 0,
        type: i < 5 ? 'input' : i < 10 ? 'hidden' : 'output',
        isScoring: false
      }));

      // Create fewer connections for cleaner gameplay
      nodesRef.current.forEach((node, i) => {
        nodesRef.current.forEach((_, j) => {
          if (i !== j && Math.random() > 0.85) {
            node.connections.push(j);
          }
        });
      });
    };

    // Initialize AI particles
    const initParticles = () => {
      particlesRef.current = Array.from({ length: 20 }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        z: Math.random() * 50,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        vz: (Math.random() - 0.5) * 0.1,
        life: Math.random(),
        size: Math.random() * 1.5 + 0.5,
        type: Math.floor(Math.random() * 3)
      }));
    };

    initNodes();
    initParticles();

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      
      if (!isGameActive) {
        setIsGameActive(true);
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Game scoring logic
    const updateScore = () => {
      let currentScore = 0;
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      
      if (mouseX < 0 || mouseY < 0) return; // Mouse not in canvas
      
      nodesRef.current.forEach(node => {
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if node is in scoring range but not in danger zone
        if (distance <= GAME_SETTINGS.SCORING_RANGE && distance > GAME_SETTINGS.DANGER_ZONE) {
          const proximity = 1 - (distance / GAME_SETTINGS.SCORING_RANGE);
          currentScore += Math.floor(proximity * 10);
          node.isScoring = true;
        } else {
          node.isScoring = false;
        }
      });
      
      setScore(currentScore);
    };

    // Animation loop
    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      
      // Update game time
      if (isGameActive) {
        setGameTime(prev => prev + 1);
      }
      
      // Create gradient background
      const gradient = ctx.createRadialGradient(
        canvas.offsetWidth / 2, canvas.offsetHeight / 2, 0,
        canvas.offsetWidth / 2, canvas.offsetHeight / 2, Math.max(canvas.offsetWidth, canvas.offsetHeight) / 2
      );
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.05)');
      gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.02)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Draw cursor zones (visual feedback)
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      
      if (mouseX >= 0 && mouseY >= 0) {
        // Danger zone (red)
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, GAME_SETTINGS.DANGER_ZONE, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Scoring zone (green)
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, GAME_SETTINGS.SCORING_RANGE, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Attraction zone (blue)
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, GAME_SETTINGS.ATTRACTION_RANGE, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Update nodes with game physics
      nodesRef.current.forEach((node, i) => {
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (mouseX >= 0 && mouseY >= 0) {
          if (distance < GAME_SETTINGS.REPULSION_RANGE) {
            // Strong repulsion - prevent touching cursor
            const force = GAME_SETTINGS.REPULSION_FORCE * (1 - distance / GAME_SETTINGS.REPULSION_RANGE);
            node.vx -= (dx / distance) * force;
            node.vy -= (dy / distance) * force;
            node.activity = 1;
          } else if (distance < GAME_SETTINGS.ATTRACTION_RANGE) {
            // Attraction - try to follow cursor
            const force = GAME_SETTINGS.ATTRACTION_FORCE * (1 - distance / GAME_SETTINGS.ATTRACTION_RANGE);
            node.vx += (dx / distance) * force;
            node.vy += (dy / distance) * force;
            node.activity = Math.min(1, 0.3 + (1 - distance / GAME_SETTINGS.ATTRACTION_RANGE) * 0.7);
          } else if (distance > GAME_SETTINGS.REJECTION_RANGE) {
            // Rejection - push away when too far
            const force = GAME_SETTINGS.REJECTION_FORCE;
            node.vx -= (dx / distance) * force;
            node.vy -= (dy / distance) * force;
            node.activity = Math.max(0, node.activity - 0.02);
          } else {
            node.activity = Math.max(0, node.activity - 0.01);
          }
        } else {
          node.activity = Math.max(0, node.activity - 0.01);
        }

        // Update position
        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;
        
        // Bounce off edges
        if (node.x < node.radius || node.x > canvas.offsetWidth - node.radius) {
          node.vx *= -0.8;
          node.x = Math.max(node.radius, Math.min(canvas.offsetWidth - node.radius, node.x));
        }
        if (node.y < node.radius || node.y > canvas.offsetHeight - node.radius) {
          node.vy *= -0.8;
          node.y = Math.max(node.radius, Math.min(canvas.offsetHeight - node.radius, node.y));
        }
        if (node.z < 0 || node.z > 100) node.vz *= -0.8;
        
        // Apply friction
        node.vx *= 0.95;
        node.vy *= 0.95;
        node.vz *= 0.98;
        
        // Update pulse
        node.pulse = Math.sin(time * 0.005 + i) * 0.5 + 0.5;
      });

      // Draw connections (simplified for gameplay)
      nodesRef.current.forEach((node) => {
        node.connections.forEach((connectionIndex: number) => {
          const connectedNode = nodesRef.current[connectionIndex];
          if (!connectedNode) return;

          const activity = (node.activity + connectedNode.activity) / 2;
          if (activity < 0.2) return; // Only draw active connections
          
          const opacity = activity * 0.3;
          
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(connectedNode.x, connectedNode.y);
          ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
          ctx.lineWidth = 1 + activity;
          ctx.stroke();
        });
      });

      // Draw nodes with game-specific styling
      nodesRef.current.forEach((node) => {
        const radius = node.radius;
        const brightness = 0.3 + node.activity * 0.7;
        const pulse = node.pulse * 0.2 + 0.8;
        
        // Enhanced glow for scoring nodes
        if (node.isScoring) {
          const scoreGlow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 4);
          scoreGlow.addColorStop(0, `rgba(34, 197, 94, ${brightness * 0.4})`);
          scoreGlow.addColorStop(1, 'rgba(34, 197, 94, 0)');
          ctx.fillStyle = scoreGlow;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 4 * pulse, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Node glow
        const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 2.5);
        glowGradient.addColorStop(0, `rgba(99, 102, 241, ${brightness * 0.4})`);
        glowGradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 2.5 * pulse, 0, Math.PI * 2);
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
        ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.6})`;
        ctx.lineWidth = node.isScoring ? 2 : 1;
        ctx.stroke();
      });

      // Update and draw particles (reduced for performance)
      particlesRef.current.forEach((particle: AIParticle) => {
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
        
        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.offsetWidth) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.offsetHeight) particle.vy *= -1;
        if (particle.z < 0 || particle.z > 50) particle.vz *= -1;
        
        const z = 25 + particle.z;
        const scale = 50 / z;
        const size = particle.size * scale;
        const alpha = (1 - particle.life) * 0.3;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        
        if (particle.type === 0) {
          ctx.fillStyle = `rgba(99, 102, 241, ${alpha})`;
        } else if (particle.type === 1) {
          ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
        }
        
        ctx.fill();
      });

      // Update score
      updateScore();
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, isGameActive]);

  // Update high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('aiCanvasHighScore', score.toString());
    }
  }, [score, highScore]);

  const resetGame = () => {
    setScore(0);
    setGameTime(0);
    setIsGameActive(false);
    mouseRef.current = { x: -1000, y: -1000 };
  };

  return (
    <div className="neural-nexus-game">
      {/* Game Header - Outside Canvas */}
      <div className="neural-nexus-header">
        <div className="neural-nexus-hud">
          <div className="neural-nexus-score-display">
            <span className="neural-nexus-score-label">Score</span>
            <span className="neural-nexus-score-value">{score}</span>
          </div>
          <div className="neural-nexus-high-score-display">
            <span className="neural-nexus-score-label">Best</span>
            <span className="neural-nexus-score-value">{highScore}</span>
          </div>
          <div className="neural-nexus-game-time">
            <span className="neural-nexus-score-label">Time</span>
            <span className="neural-nexus-score-value">{Math.floor(gameTime / 60)}s</span>
          </div>
          <button className="neural-nexus-reset-button" onClick={resetGame}>
            Reset
          </button>
        </div>
      </div>
      
      {/* Game Canvas - Clean Area */}
      <div className="neural-nexus-container">
        <canvas
          ref={canvasRef}
          className={`neural-nexus-canvas ${className}`}
          style={{
            width: width || '100%',
            height: height || '100%',
            cursor: 'crosshair'
          }}
        />
      </div>
      
      {/* Game Footer - Outside Canvas */}
      <div className="neural-nexus-footer">
        <div className="neural-nexus-game-instructions">
          {!isGameActive ? (
            <p>🎯 Move your cursor to attract nodes and earn points! Keep them close but don't let them touch you!</p>
          ) : (
            <p>🟢 Green nodes are scoring! 🔴 Red zone = danger, 🟢 Green zone = points, 🔵 Blue zone = attraction</p>
          )}
        </div>
      </div>
    </div>
  );
} 