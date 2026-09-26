import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '@/lib/utils';
import { INK_SIZE, createInk, inkToDigit, stampBrush, strokeSegment } from './preprocess';
import { paintDigit } from './render';

export interface DrawPadHandle {
  clear: () => void;
}

interface Props {
  /** Receives the MNIST-normalised 28×28 digit after each stroke update (null when empty). */
  onChange: (digit: Float32Array | null) => void;
  className?: string;
}

// ~11px pen on the 112px pad: after scaling a full-height digit into MNIST's 20px
// box it lands at the dataset's typical 2–3px stroke width.
const BRUSH_RADIUS = 4;

/** Free-hand drawing surface (mouse, pen or touch) that feeds the classifier. */
const DrawPad = forwardRef<DrawPadHandle, Props>(function DrawPad({ onChange, className }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef(createInk());
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef(0);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const flush = useCallback(() => {
    frameRef.current = 0;
    paintDigit(canvasRef.current, inkRef.current);
    onChangeRef.current(inkToDigit(inkRef.current));
  }, []);

  const schedule = useCallback(() => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(flush);
  }, [flush]);

  useImperativeHandle(
    ref,
    () => ({
      clear() {
        inkRef.current.fill(0);
        lastPointRef.current = null;
        flush();
      },
    }),
    [flush],
  );

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const toInk = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * INK_SIZE,
      y: ((event.clientY - rect.top) / rect.height) * INK_SIZE,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = toInk(event);
    stampBrush(inkRef.current, INK_SIZE, point.x, point.y, BRUSH_RADIUS);
    lastPointRef.current = point;
    schedule();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const last = lastPointRef.current;
    if (!last) return;
    const point = toInk(event);
    strokeSegment(inkRef.current, INK_SIZE, last, point, BRUSH_RADIUS);
    lastPointRef.current = point;
    schedule();
  };

  const endStroke = () => {
    lastPointRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={INK_SIZE}
      height={INK_SIZE}
      role="img"
      aria-label="Drawing pad. Draw a digit from 0 to 9 with a mouse, pen or finger."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onLostPointerCapture={endStroke}
      className={cn('cursor-crosshair touch-none rounded-md bg-black ring-1 ring-border', className)}
    />
  );
});

export default DrawPad;
