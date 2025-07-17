import { useEffect, useRef, useCallback, useState } from 'react';

interface Props {
  content: string;
  width: number;
  height: number;
}

export default function MatrixRPGCanvas({ content, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>();
  const [scrollY, setScrollY] = useState(0);
  const [maxScrollY, setMaxScrollY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Text rendering constants
  const LINE_HEIGHT = 18;
  const PADDING = 20;
  const FONT_FAMILY = 'bold 14px "Courier New", VT323, monospace';

  const calculateTextHeight = useCallback((lines: string[]) => {
    return lines.length * LINE_HEIGHT + PADDING * 2;
  }, []);

  const drawText = useCallback((ctx: CanvasRenderingContext2D, lines: string[], scrollOffset: number) => {
    ctx.font = FONT_FAMILY;
    ctx.fillStyle = '#33ff33';
    ctx.shadowColor = '#33ff33';
    ctx.shadowBlur = 1;
    ctx.textBaseline = 'top';

    let currentY = PADDING - scrollOffset;

    lines.forEach((line) => {
      // Only draw lines that are visible in the viewport
      if (currentY >= -LINE_HEIGHT && currentY <= height + LINE_HEIGHT) {
        // Add subtle glow effect to text
        ctx.shadowBlur = 2;
        ctx.fillText(line, PADDING, currentY);

        // Add a second pass for extra glow
        ctx.shadowBlur = 4;
        ctx.globalAlpha = 0.3;
        ctx.fillText(line, PADDING, currentY);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 1;
      }

      currentY += LINE_HEIGHT;
    });
  }, [height]);

  const drawCRTEffect = useCallback(() => {
    const effectCanvas = effectCanvasRef.current;
    if (!effectCanvas) return;

    const effectCtx = effectCanvas.getContext('2d');
    if (!effectCtx) return;

    // Clear effect canvas
    effectCtx.clearRect(0, 0, width, height);

    // Draw animated scan line
    const scanLineHeight = 3;
    const scanLineY = (Date.now() / 15) % (height + scanLineHeight);
    const scanLineGradient = effectCtx.createLinearGradient(0, scanLineY - scanLineHeight, 0, scanLineY + scanLineHeight);
    scanLineGradient.addColorStop(0, 'rgba(51, 255, 51, 0)');
    scanLineGradient.addColorStop(0.5, 'rgba(51, 255, 51, 0.3)');
    scanLineGradient.addColorStop(1, 'rgba(51, 255, 51, 0)');
    effectCtx.fillStyle = scanLineGradient;
    effectCtx.fillRect(0, scanLineY - scanLineHeight, width, scanLineHeight * 2);

    // Draw screen flicker with subtle variation
    const flickerOpacity = 0.02 + Math.sin(Date.now() / 100) * 0.01;
    effectCtx.fillStyle = `rgba(51, 255, 51, ${flickerOpacity})`;
    effectCtx.fillRect(0, 0, width, height);

    // Draw horizontal scan lines (CRT raster lines)
    effectCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    effectCtx.lineWidth = 1;
    for (let y = 0; y < height; y += 2) {
      effectCtx.beginPath();
      effectCtx.moveTo(0, y);
      effectCtx.lineTo(width, y);
      effectCtx.stroke();
    }

    // Create curved screen vignette effect
    const gradient = effectCtx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 1.2
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0.1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
    effectCtx.fillStyle = gradient;
    effectCtx.fillRect(0, 0, width, height);

    // Add subtle color aberration effect
    const aberrationOffset = Math.sin(Date.now() / 1000) * 0.5;
    effectCtx.globalCompositeOperation = 'screen';
    effectCtx.fillStyle = `rgba(255, 0, 0, 0.02)`;
    effectCtx.fillRect(aberrationOffset, 0, width, height);
    effectCtx.fillStyle = `rgba(0, 0, 255, 0.02)`;
    effectCtx.fillRect(-aberrationOffset, 0, width, height);
    effectCtx.globalCompositeOperation = 'source-over';

    // Draw scroll indicator if scrollable
    if (maxScrollY > 0) {
      const scrollbarWidth = 6;
      const scrollbarHeight = height - 40;
      const scrollbarX = width - scrollbarWidth - 10;
      const scrollbarY = 20;

      // Scrollbar track
      effectCtx.fillStyle = 'rgba(51, 255, 51, 0.1)';
      effectCtx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);

      // Scrollbar thumb
      const thumbHeight = Math.max(20, (height / (maxScrollY + height)) * scrollbarHeight);
      const thumbY = scrollbarY + (scrollY / maxScrollY) * (scrollbarHeight - thumbHeight);

      effectCtx.fillStyle = 'rgba(51, 255, 51, 0.5)';
      effectCtx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
    }

    animationIdRef.current = requestAnimationFrame(drawCRTEffect);
  }, [width, height, maxScrollY, scrollY]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setIsScrolling(true);

    const scrollSpeed = 60;
    const newScrollY = Math.max(0, Math.min(maxScrollY, scrollY + e.deltaY * scrollSpeed / 100));
    setScrollY(newScrollY);

    // Auto-scroll to bottom when new content is added
    if (newScrollY >= maxScrollY - 10) {
      setScrollY(maxScrollY);
    }

    // Clear scrolling indicator after a delay
    setTimeout(() => setIsScrolling(false), 150);
  }, [scrollY, maxScrollY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const effectCanvas = effectCanvasRef.current;
    if (!canvas || !effectCanvas || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext('2d');
    const effectCtx = effectCanvas.getContext('2d');
    if (!ctx || !effectCtx) return;

    // Set canvas resolution for crisp text
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    effectCanvas.width = width * dpr;
    effectCanvas.height = height * dpr;

    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);
    effectCtx.scale(dpr, dpr);

    // Clear canvas with dark green background
    ctx.fillStyle = '#001100';
    ctx.fillRect(0, 0, width, height);

    // Split content into lines and calculate scroll bounds
    const lines = content.split('\n');
    const textHeight = calculateTextHeight(lines);
    const newMaxScrollY = Math.max(0, textHeight - height);
    setMaxScrollY(newMaxScrollY);

    // Auto-scroll to bottom when new content is added (but not during user scroll)
    if (!isScrolling && newMaxScrollY > maxScrollY) {
      setScrollY(newMaxScrollY);
    }

    // Draw text with current scroll position
    drawText(ctx, lines, scrollY);

    // Start CRT effect animation
    drawCRTEffect();

    // Add wheel event listener for scrolling
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Cleanup animation on unmount
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [content, width, height, scrollY, drawCRTEffect, handleWheel, calculateTextHeight, drawText, isScrolling, maxScrollY]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`matrix-rpg-canvas-container ${maxScrollY > 0 ? 'matrix-rpg-canvas-container--scrollable' : ''}`}
    >
      <canvas
        ref={canvasRef}
        className="matrix-rpg-canvas matrix-rpg-canvas--main"
      />
      <canvas
        ref={effectCanvasRef}
        className="matrix-rpg-canvas matrix-rpg-canvas--effects"
      />
    </div>
  );
}
