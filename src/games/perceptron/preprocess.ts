/**
 * Turns a free-hand drawing into an MNIST-style input, following the dataset's own
 * normalisation: the digit's bounding box is scaled (aspect preserved, anti-aliased)
 * to fit a 20×20 box, then placed in the 28×28 frame so its centre of mass sits at
 * the centre. Without this step a digit drawn small or off-centre would be scored
 * against templates it never lines up with.
 */

export const INK_SIZE = 112;
export const DIGIT_SIZE = 28;
const FIT_BOX = 20;
const INK_THRESHOLD = 0.05;

/** A square float canvas the drawing pad paints into (values 0–1). */
export function createInk(size = INK_SIZE): Float32Array {
  return new Float32Array(size * size);
}

/** Stamps a soft round brush at (x, y), keeping the max of existing and new ink. */
export function stampBrush(ink: Float32Array, size: number, x: number, y: number, radius: number): void {
  const reach = radius + 1.5;
  const x0 = Math.max(0, Math.floor(x - reach));
  const x1 = Math.min(size - 1, Math.ceil(x + reach));
  const y0 = Math.max(0, Math.floor(y - reach));
  const y1 = Math.min(size - 1, Math.ceil(y + reach));
  for (let py = y0; py <= y1; py += 1) {
    for (let px = x0; px <= x1; px += 1) {
      const distance = Math.hypot(px + 0.5 - x, py + 0.5 - y);
      // Solid core with a 1.5px anti-aliased falloff.
      const value = Math.max(0, Math.min(1, (reach - distance) / 1.5));
      const index = py * size + px;
      if (value > ink[index]) ink[index] = value;
    }
  }
}

/** Stamps along the segment (x0, y0) → (x1, y1) so fast strokes stay continuous. */
export function strokeSegment(
  ink: Float32Array,
  size: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 0.75));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    stampBrush(ink, size, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, radius);
  }
}

/**
 * Converts ink to a 28×28 digit (values 0–1). Returns null for an empty canvas.
 */
export function inkToDigit(ink: Float32Array, size = INK_SIZE): Float32Array | null {
  let minX = size;
  let minY = size;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (ink[y * size + x] > INK_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const scale = FIT_BOX / Math.max(boxW, boxH);
  const outW = Math.max(1, Math.round(boxW * scale));
  const outH = Math.max(1, Math.round(boxH * scale));

  // Area-average resample of the bounding box into outW × outH.
  const fitted = new Float32Array(outW * outH);
  for (let ty = 0; ty < outH; ty += 1) {
    const sy0 = minY + ty / scale;
    const sy1 = minY + (ty + 1) / scale;
    for (let tx = 0; tx < outW; tx += 1) {
      const sx0 = minX + tx / scale;
      const sx1 = minX + (tx + 1) / scale;
      let sum = 0;
      let area = 0;
      for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy += 1) {
        const coverY = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        if (coverY <= 0 || sy >= size) continue;
        for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx += 1) {
          const coverX = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          if (coverX <= 0 || sx >= size) continue;
          sum += ink[sy * size + sx] * coverX * coverY;
          area += coverX * coverY;
        }
      }
      fitted[ty * outW + tx] = area > 0 ? sum / area : 0;
    }
  }

  // Centre of mass of the fitted digit, in pixel-centre coordinates.
  let mass = 0;
  let cx = 0;
  let cy = 0;
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const value = fitted[y * outW + x];
      mass += value;
      cx += value * (x + 0.5);
      cy += value * (y + 0.5);
    }
  }
  if (mass <= 0) return null;
  cx /= mass;
  cy /= mass;

  const center = DIGIT_SIZE / 2;
  const offsetX = Math.max(0, Math.min(DIGIT_SIZE - outW, Math.round(center - cx)));
  const offsetY = Math.max(0, Math.min(DIGIT_SIZE - outH, Math.round(center - cy)));

  const digit = new Float32Array(DIGIT_SIZE * DIGIT_SIZE);
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      digit[(y + offsetY) * DIGIT_SIZE + x + offsetX] = Math.min(1, fitted[y * outW + x]);
    }
  }
  return digit;
}
