import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { paintDigit } from './render';

interface Props {
  /** Bytes (0–255) or floats (0–1); null renders an empty tile. */
  source: Uint8Array | Float32Array | null;
  offset?: number;
  size?: number;
  /** Accessible description; omit for decorative tiles. */
  label?: string;
  className?: string;
}

/** A single MNIST-style digit: white ink on black, one CSS-scaled square per pixel. */
export default function DigitCanvas({ source, offset = 0, size = 28, label, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (source) {
      paintDigit(canvas, source, offset);
      return;
    }
    try {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    } catch {
      // No 2D context (e.g. a headless environment): nothing to clear.
    }
  }, [source, offset]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('rounded-md bg-black [image-rendering:pixelated]', className)}
    />
  );
}
