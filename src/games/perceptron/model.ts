/**
 * A single-layer linear classifier: one output neuron per digit, each with a weight
 * per input pixel plus a bias. Two learning rules share the same neurons:
 *
 * - `perceptron` (Rosenblatt, 1958): predict argmax(w·x + b); on a mistake add x to
 *   the true class and subtract it from the wrongly predicted one. Correct guesses
 *   change nothing. With zero-initialised weights the rule is scale-invariant, so it
 *   needs no learning rate.
 * - `softmax`: turn scores into probabilities and take one SGD step on cross-entropy,
 *   w_k -= η (p_k - [k = y]) x, which nudges every neuron on every sample.
 *
 * Inputs are pixels scaled to [0, 1]. MNIST digits are ~80% background, so each input
 * is first packed into a sparse list of non-zero pixels; scoring and updates only
 * touch those, which is several times faster than dense loops.
 */

export const CLASSES = 10;
export const SOFTMAX_LEARNING_RATE = 0.05;

export type LearningRule = 'perceptron' | 'softmax';

const BYTE_SCALE = 1 / 255;

export class LinearModel {
  readonly inputs: number;
  /** Weights per class: `inputs` pixel weights followed by one bias. */
  readonly stride: number;
  readonly weights: Float32Array;
  /** Whether the last `train*` call changed the weights. */
  lastUpdated = false;

  private readonly nzIndex: Uint16Array;
  private readonly nzValue: Float32Array;
  private nzCount = 0;
  private readonly probs = new Float32Array(CLASSES);

  constructor(inputs: number) {
    this.inputs = inputs;
    this.stride = inputs + 1;
    this.weights = new Float32Array(CLASSES * this.stride);
    this.nzIndex = new Uint16Array(inputs);
    this.nzValue = new Float32Array(inputs);
  }

  reset(): void {
    this.weights.fill(0);
    this.lastUpdated = false;
  }

  copyFrom(other: LinearModel): void {
    this.weights.set(other.weights);
  }

  /** Scores a byte image (`inputs` bytes at `offset`) into `out`; returns the predicted class. */
  scoreImage(images: Uint8Array, offset: number, out: Float32Array): number {
    this.loadBytes(images, offset);
    return this.scoreLoaded(out);
  }

  /** Scores a [0, 1] float vector into `out`; returns the predicted class. */
  scoreVector(x: Float32Array, out: Float32Array): number {
    let count = 0;
    for (let p = 0; p < this.inputs; p += 1) {
      const value = x[p];
      if (value !== 0) {
        this.nzIndex[count] = p;
        this.nzValue[count] = value;
        count += 1;
      }
    }
    this.nzCount = count;
    return this.scoreLoaded(out);
  }

  /**
   * One training step on a byte image. `out` receives the scores the prediction was
   * based on (before the update); the predicted class is returned.
   */
  trainImage(
    images: Uint8Array,
    offset: number,
    label: number,
    rule: LearningRule,
    out: Float32Array,
    learningRate = SOFTMAX_LEARNING_RATE,
  ): number {
    this.loadBytes(images, offset);
    const predicted = this.scoreLoaded(out);

    if (rule === 'perceptron') {
      this.lastUpdated = predicted !== label;
      if (this.lastUpdated) {
        this.addInput(label, 1);
        this.addInput(predicted, -1);
      }
      return predicted;
    }

    softmaxInto(out, this.probs);
    for (let k = 0; k < CLASSES; k += 1) {
      const gradient = this.probs[k] - (k === label ? 1 : 0);
      this.addInput(k, -learningRate * gradient);
    }
    this.lastUpdated = true;
    return predicted;
  }

  private loadBytes(images: Uint8Array, offset: number): void {
    let count = 0;
    for (let p = 0; p < this.inputs; p += 1) {
      const value = images[offset + p];
      if (value !== 0) {
        this.nzIndex[count] = p;
        this.nzValue[count] = value * BYTE_SCALE;
        count += 1;
      }
    }
    this.nzCount = count;
  }

  private scoreLoaded(out: Float32Array): number {
    const { weights, stride, nzIndex, nzValue, nzCount, inputs } = this;
    let best = 0;
    let bestScore = -Infinity;
    for (let k = 0; k < CLASSES; k += 1) {
      const base = k * stride;
      let sum = weights[base + inputs];
      for (let i = 0; i < nzCount; i += 1) sum += weights[base + nzIndex[i]] * nzValue[i];
      out[k] = sum;
      if (sum > bestScore) {
        bestScore = sum;
        best = k;
      }
    }
    return best;
  }

  /** w_k += scale · x (and the bias by `scale`) for the currently loaded input. */
  private addInput(k: number, scale: number): void {
    const { weights, nzIndex, nzValue, nzCount } = this;
    const base = k * this.stride;
    for (let i = 0; i < nzCount; i += 1) weights[base + nzIndex[i]] += scale * nzValue[i];
    weights[base + this.inputs] += scale;
  }
}

/** Numerically stable softmax of `scores` into `out`. */
export function softmaxInto(scores: ArrayLike<number>, out: Float32Array): Float32Array {
  let max = -Infinity;
  for (let k = 0; k < CLASSES; k += 1) max = Math.max(max, scores[k]);
  let sum = 0;
  for (let k = 0; k < CLASSES; k += 1) {
    out[k] = Math.exp(scores[k] - max);
    sum += out[k];
  }
  for (let k = 0; k < CLASSES; k += 1) out[k] /= sum;
  return out;
}
