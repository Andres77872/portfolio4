/**
 * Canvas painters for 28×28 images. Canvases stay at their native 28×28 resolution and
 * are scaled up by CSS with `image-rendering: pixelated`, so every input pixel and
 * every weight is one crisp square. Painting only writes pixels (never reads them
 * back), which keeps it immune to canvas-fingerprinting noise some browsers inject.
 */
import type { LinearModel } from './model';

type Rgb = readonly [number, number, number];

export interface WeightPalette {
  /** Colour of weights that push a digit's score up. */
  positive: Rgb;
  /** Colour of weights that push it down. */
  negative: Rgb;
}

/** Indigo (+) / orange (−), shaded per theme so both signs read equally well. */
export const WEIGHT_PALETTES: Record<'light' | 'dark', WeightPalette> = {
  dark: { positive: [165, 180, 252], negative: [251, 146, 60] }, // indigo-300 / orange-400
  light: { positive: [79, 70, 229], negative: [234, 88, 12] }, // indigo-600 / orange-600
};

const imageCache = new WeakMap<HTMLCanvasElement, ImageData>();

function imageFor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): ImageData {
  let image = imageCache.get(canvas);
  if (!image || image.width !== canvas.width || image.height !== canvas.height) {
    image = ctx.createImageData(canvas.width, canvas.height);
    imageCache.set(canvas, image);
  }
  return image;
}

function context(canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null {
  if (!canvas) return null;
  try {
    return canvas.getContext('2d');
  } catch {
    return null;
  }
}

/**
 * Paints the weight template of class `k` as a diverging heat map, normalised to that
 * class's largest |w| so every template stays readable as it grows.
 */
export function paintWeights(
  canvas: HTMLCanvasElement | null,
  model: LinearModel,
  k: number,
  palette: WeightPalette = WEIGHT_PALETTES.dark,
): void {
  const ctx = context(canvas);
  if (!ctx || !canvas) return;
  const { weights, stride, inputs } = model;
  const base = k * stride;

  let max = 0;
  for (let p = 0; p < inputs; p += 1) max = Math.max(max, Math.abs(weights[base + p]));

  const image = imageFor(canvas, ctx);
  const { data } = image;
  for (let p = 0; p < inputs; p += 1) {
    const w = weights[base + p];
    const [r, g, b] = w >= 0 ? palette.positive : palette.negative;
    const i = p * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = max === 0 ? 0 : Math.round((Math.abs(w) / max) * 255);
  }
  ctx.putImageData(image, 0, 0);
}

/** Paints a digit as white ink on a transparent background (the tile supplies the black). */
export function paintDigit(canvas: HTMLCanvasElement | null, source: Uint8Array | Float32Array, offset = 0): void {
  const ctx = context(canvas);
  if (!ctx || !canvas) return;
  const image = imageFor(canvas, ctx);
  const { data } = image;
  const pixels = canvas.width * canvas.height;
  const scale = source instanceof Uint8Array ? 1 : 255;
  for (let p = 0; p < pixels; p += 1) {
    const i = p * 4;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = Math.round(Math.min(255, source[offset + p] * scale));
  }
  ctx.putImageData(image, 0, 0);
}
