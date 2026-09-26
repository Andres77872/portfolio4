/**
 * Drives online training over the MNIST subset in small, time-boxed slices so the UI
 * stays responsive: `run()` trains until a sample count or a millisecond budget runs out.
 *
 * Test accuracy is measured at checkpoints (dense early, when learning is fastest, then
 * every 500 samples). Each evaluation runs on a frozen copy of the weights and is spread
 * over as many slices as it needs, so a chart point always describes the model exactly
 * as it was at that sample count — even while training continues.
 */
import type { MnistDataset } from './dataset';
import { CLASSES, LinearModel, softmaxInto, type LearningRule } from './model';

export const RECENT_WINDOW = 500;
export const MAX_EPOCHS = 20;
const MAX_TEST_MISTAKES = 48;

export interface SampleView {
  /** Index into the training split. */
  index: number;
  label: number;
  predicted: number;
  correct: boolean;
  /** Whether this sample changed the weights (perceptron: only on mistakes). */
  updated: boolean;
  /** Raw scores w·x + b that produced the prediction (before the update). */
  scores: Float32Array;
  /** Softmax probabilities of those scores (what the softmax rule optimises). */
  probabilities: Float32Array;
}

export interface EvaluationResult {
  seen: number;
  accuracy: number;
  /** Recall per digit: share of test images of that digit classified correctly. */
  perClass: Float32Array;
  /** `confusion[label * 10 + predicted]` counts over the test split. */
  confusion: Uint32Array;
  /** Test samples the model got wrong (first few), for inspection. */
  mistakes: TestMistake[];
}

export interface TestMistake {
  /** Index into the test split. */
  index: number;
  label: number;
  predicted: number;
}

export interface HistoryPoint {
  seen: number;
  testAccuracy: number;
  /** Accuracy on the last RECENT_WINDOW training samples, before each update. */
  trainAccuracy: number | null;
}

interface EvaluationJob {
  model: LinearModel;
  seen: number;
  trainAccuracy: number | null;
  position: number;
  correct: number;
  confusion: Uint32Array;
  mistakes: TestMistake[];
}

/** Next sample count at which test accuracy is measured. */
export function nextCheckpoint(seen: number): number {
  const step = seen < 100 ? 25 : seen < 1000 ? 100 : 500;
  return (Math.floor(seen / step) + 1) * step;
}

/** mulberry32: small, fast, seedable PRNG so runs are reproducible. */
export function createRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class Trainer {
  readonly dataset: MnistDataset;
  readonly model: LinearModel;
  rule: LearningRule;

  seen = 0;
  updates = 0;
  history: HistoryPoint[] = [];
  lastEvaluation: EvaluationResult | null = null;
  last: SampleView | null = null;

  private readonly seed: number;
  private rng: () => number;
  private order: Uint32Array;
  private cursor = 0;
  private readonly scores = new Float32Array(CLASSES);
  private readonly recent = new Uint8Array(RECENT_WINDOW);
  private recentCount = 0;
  private recentCorrect = 0;
  private recentPosition = 0;
  private checkpoint = 0;
  private job: EvaluationJob | null = null;
  private readonly evalModel: LinearModel;
  private readonly evalScores = new Float32Array(CLASSES);

  constructor(dataset: MnistDataset, rule: LearningRule = 'perceptron', seed = 1) {
    this.dataset = dataset;
    this.rule = rule;
    this.seed = seed;
    this.model = new LinearModel(dataset.pixels);
    this.evalModel = new LinearModel(dataset.pixels);
    this.rng = createRng(seed);
    this.order = new Uint32Array(dataset.train.count);
    this.shuffleOrder();
  }

  get trainCount(): number {
    return this.dataset.train.count;
  }

  /** 1-based epoch the next sample belongs to. */
  get epoch(): number {
    return Math.min(MAX_EPOCHS, Math.floor(this.seen / this.trainCount) + 1);
  }

  /** Progress through the current epoch, 0–1. */
  get epochProgress(): number {
    if (this.isFinished) return 1;
    return (this.seen % this.trainCount) / this.trainCount;
  }

  get isFinished(): boolean {
    return this.seen >= MAX_EPOCHS * this.trainCount;
  }

  get isEvaluating(): boolean {
    return this.job !== null;
  }

  get trainAccuracy(): number | null {
    return this.recentCount === 0 ? null : this.recentCorrect / this.recentCount;
  }

  reset(rule: LearningRule = this.rule): void {
    this.rule = rule;
    this.model.reset();
    this.seen = 0;
    this.updates = 0;
    this.history = [];
    this.lastEvaluation = null;
    this.last = null;
    this.recent.fill(0);
    this.recentCount = 0;
    this.recentCorrect = 0;
    this.recentPosition = 0;
    this.checkpoint = 0;
    this.job = null;
    this.rng = createRng(this.seed);
    this.cursor = 0;
    this.shuffleOrder();
  }

  /** Trains exactly one sample (finishing any due evaluation first). */
  step(): SampleView | null {
    this.flushEvaluation();
    if (this.isFinished) return null;
    this.trainOne();
    this.last = this.captureLast();
    if (this.seen >= this.checkpoint) this.flushEvaluation();
    return this.last;
  }

  /**
   * Trains up to `maxSamples` samples and advances evaluation, stopping once
   * `budgetMs` has elapsed. Returns how many samples were trained.
   */
  run(maxSamples: number, budgetMs: number): number {
    const deadline = now() + budgetMs;
    let trained = 0;

    for (;;) {
      if (this.job) {
        this.advanceEvaluation(deadline);
        if (this.job) break;
      }
      if (this.seen >= this.checkpoint) {
        this.startEvaluation();
        continue;
      }
      if (trained >= maxSamples || this.isFinished) break;

      this.trainOne();
      trained += 1;
      if ((trained & 31) === 0 && now() >= deadline) break;
    }

    if (trained > 0) this.last = this.captureLast();
    return trained;
  }

  /** Completes any pending or due evaluation synchronously. */
  flushEvaluation(): void {
    if (!this.job && this.seen >= this.checkpoint) this.startEvaluation();
    if (this.job) this.advanceEvaluation(Infinity);
  }

  private shuffleOrder(): void {
    const { order } = this;
    for (let i = 0; i < order.length; i += 1) order[i] = i;
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      const swap = order[i];
      order[i] = order[j];
      order[j] = swap;
    }
  }

  private lastIndex = 0;
  private lastLabel = 0;
  private lastPredicted = 0;

  private trainOne(): void {
    if (this.cursor >= this.order.length) {
      this.cursor = 0;
      this.shuffleOrder();
    }
    const index = this.order[this.cursor];
    this.cursor += 1;

    const { images, labels } = this.dataset.train;
    const label = labels[index];
    const predicted = this.model.trainImage(images, index * this.dataset.pixels, label, this.rule, this.scores);
    const correct = predicted === label ? 1 : 0;

    this.seen += 1;
    if (this.model.lastUpdated) this.updates += 1;

    if (this.recentCount === RECENT_WINDOW) this.recentCorrect -= this.recent[this.recentPosition];
    else this.recentCount += 1;
    this.recent[this.recentPosition] = correct;
    this.recentCorrect += correct;
    this.recentPosition = (this.recentPosition + 1) % RECENT_WINDOW;

    this.lastIndex = index;
    this.lastLabel = label;
    this.lastPredicted = predicted;
  }

  private captureLast(): SampleView {
    const scores = Float32Array.from(this.scores);
    return {
      index: this.lastIndex,
      label: this.lastLabel,
      predicted: this.lastPredicted,
      correct: this.lastLabel === this.lastPredicted,
      updated: this.model.lastUpdated,
      scores,
      probabilities: softmaxInto(scores, new Float32Array(CLASSES)),
    };
  }

  private startEvaluation(): void {
    this.evalModel.copyFrom(this.model);
    this.job = {
      model: this.evalModel,
      seen: this.seen,
      trainAccuracy: this.trainAccuracy,
      position: 0,
      correct: 0,
      confusion: new Uint32Array(CLASSES * CLASSES),
      mistakes: [],
    };
    this.checkpoint = nextCheckpoint(this.seen);
  }

  private advanceEvaluation(deadline: number): void {
    const job = this.job;
    if (!job) return;
    const { images, labels, count } = this.dataset.test;
    const { pixels } = this.dataset;

    while (job.position < count) {
      const end = Math.min(count, job.position + 64);
      for (let i = job.position; i < end; i += 1) {
        const label = labels[i];
        const predicted = job.model.scoreImage(images, i * pixels, this.evalScores);
        job.confusion[label * CLASSES + predicted] += 1;
        if (predicted === label) job.correct += 1;
        else if (job.mistakes.length < MAX_TEST_MISTAKES) job.mistakes.push({ index: i, label, predicted });
      }
      job.position = end;
      if (job.position < count && now() >= deadline) return;
    }

    const perClass = new Float32Array(CLASSES);
    for (let label = 0; label < CLASSES; label += 1) {
      let total = 0;
      for (let predicted = 0; predicted < CLASSES; predicted += 1) total += job.confusion[label * CLASSES + predicted];
      perClass[label] = total === 0 ? 0 : job.confusion[label * CLASSES + label] / total;
    }

    const accuracy = job.correct / count;
    this.lastEvaluation = { seen: job.seen, accuracy, perClass, confusion: job.confusion, mistakes: job.mistakes };
    this.history = [...this.history, { seen: job.seen, testAccuracy: accuracy, trainAccuracy: job.trainAccuracy }];
    this.job = null;
  }
}
