import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BrainCircuit,
  Download,
  Eraser,
  Info,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  TriangleAlert,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SegmentedControl, { type SegmentedOption } from '../shared/SegmentedControl';
import AccuracyChart from './AccuracyChart';
import DigitCanvas from './DigitCanvas';
import DrawPad, { type DrawPadHandle } from './DrawPad';
import PerceptronInfo from './PerceptronInfo';
import ScoreBars from './ScoreBars';
import {
  DATASET_MANIFEST,
  DatasetError,
  getCachedDataset,
  isDatasetLoading,
  loadDataset,
  subscribeToDatasetProgress,
  type LoadProgress,
  type MnistDataset,
} from './dataset';
import { CLASSES, softmaxInto, type LearningRule } from './model';
import { WEIGHT_PALETTES, paintWeights } from './render';
import { MAX_EPOCHS, RECENT_WINDOW, Trainer, type EvaluationResult, type HistoryPoint, type SampleView } from './trainer';

type Phase = 'intro' | 'loading' | 'ready' | 'error';
type SpeedId = 'slow' | 'normal' | 'fast' | 'max';
type View = 'sample' | 'draw' | 'errors';

const SPEEDS: Record<SpeedId, number> = { slow: 3, normal: 30, fast: 300, max: Number.POSITIVE_INFINITY };

const SPEED_OPTIONS: SegmentedOption<SpeedId>[] = [
  { value: 'slow', label: '3/s', title: '3 samples per second: watch every single update' },
  { value: 'normal', label: '30/s', title: '30 samples per second' },
  { value: 'fast', label: '300/s', title: '300 samples per second: one epoch in about 30 seconds' },
  { value: 'max', label: 'Max', title: 'As fast as your device allows' },
];

const RULE_OPTIONS: SegmentedOption<LearningRule>[] = [
  { value: 'perceptron', label: 'Perceptron', title: 'Rosenblatt rule: update only on mistakes' },
  { value: 'softmax', label: 'Softmax', title: 'Gradient descent on cross-entropy: update on every sample' },
];

const VIEWS: { id: View; label: string }[] = [
  { id: 'sample', label: 'Live sample' },
  { id: 'draw', label: 'Draw' },
  { id: 'errors', label: 'Test errors' },
];

const DIGITS = Array.from({ length: CLASSES }, (_, digit) => digit);
const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';
const MB = 1024 * 1024;
const MAX_ERROR_TILES = 12;

// The training session outlives the component: switching to another experiment and back
// resumes (paused) where you left off instead of throwing the trained model away.
let session: Trainer | null = null;
// "Load MNIST & train" survives an unmount mid-download, so training still starts once
// the data arrives and the demo is shown again.
let autoStartPending = false;

interface Hud {
  rule: LearningRule;
  seen: number;
  epoch: number;
  epochProgress: number;
  updates: number;
  trainAccuracy: number | null;
  history: HistoryPoint[];
  evaluation: EvaluationResult | null;
  last: SampleView | null;
  finished: boolean;
}

const readHud = (trainer: Trainer): Hud => ({
  rule: trainer.rule,
  seen: trainer.seen,
  epoch: trainer.epoch,
  epochProgress: trainer.epochProgress,
  updates: trainer.updates,
  trainAccuracy: trainer.trainAccuracy,
  history: trainer.history,
  evaluation: trainer.lastEvaluation,
  last: trainer.last,
  finished: trainer.isFinished,
});

const percent = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? '—' : `${(value * 100).toFixed(digits)}%`;

const STAGE_LABEL: Record<LoadProgress['stage'], string> = {
  download: 'Downloading MNIST',
  decompress: 'Decompressing',
  verify: 'Verifying checksum',
};

interface PerceptronProps {
  className?: string;
}

/** The trainer for an already-downloaded dataset (created on first use), else null. */
function sessionForCachedDataset(): Trainer | null {
  const dataset = getCachedDataset();
  if (!dataset) return null;
  if (!session || session.dataset !== dataset) session = new Trainer(dataset);
  return session;
}

export default function Perceptron({ className }: PerceptronProps) {
  const [initialTrainer] = useState(sessionForCachedDataset);
  const [phase, setPhase] = useState<Phase>(() => (initialTrainer ? 'ready' : isDatasetLoading() ? 'loading' : 'intro'));
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<SpeedId>('fast');
  const [view, setView] = useState<View>('sample');
  const [showInfo, setShowInfo] = useState(false);
  const [drawn, setDrawn] = useState<Float32Array | null>(null);
  const [hud, setHud] = useState<Hud | null>(() => (initialTrainer ? readHud(initialTrainer) : null));
  const [announcement, setAnnouncement] = useState('');

  const trainerRef = useRef<Trainer | null>(initialTrainer);
  const weightCanvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);
  const drawPadRef = useRef<DrawPadHandle>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const speedRef = useRef(speed);
  // Mirrors `running`, but flips synchronously so Step/Reset/Pause stop the loop before
  // it can train one more frame ahead of React's effect cleanup.
  const runningRef = useRef(running);
  const mountedRef = useRef(false);
  const { resolvedTheme } = useTheme();
  const palette = WEIGHT_PALETTES[resolvedTheme === 'light' ? 'light' : 'dark'];
  const paletteRef = useRef(palette);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const setRunningState = useCallback((value: boolean) => {
    runningRef.current = value;
    setRunning(value);
  }, []);

  const paintAllWeights = useCallback(() => {
    const trainer = trainerRef.current;
    if (!trainer) return;
    DIGITS.forEach((digit) => paintWeights(weightCanvasesRef.current[digit], trainer.model, digit, paletteRef.current));
  }, []);

  useEffect(() => {
    paletteRef.current = palette;
    paintAllWeights();
  }, [palette, paintAllWeights]);

  const refresh = useCallback(() => {
    const trainer = trainerRef.current;
    if (trainer) setHud(readHud(trainer));
  }, []);

  const attach = useCallback(
    (dataset: MnistDataset) => {
      if (!session || session.dataset !== dataset) session = new Trainer(dataset);
      trainerRef.current = session;
      setPhase('ready');
      refresh();
      if (autoStartPending) {
        autoStartPending = false;
        setRunningState(true);
      }
    },
    [refresh, setRunningState],
  );

  const load = useCallback(async () => {
    setPhase('loading');
    setError(null);
    try {
      const dataset = await loadDataset();
      if (!mountedRef.current) return;
      attach(dataset);
      setAnnouncement(
        `MNIST loaded: ${DATASET_MANIFEST.trainCount.toLocaleString()} training and ${DATASET_MANIFEST.testCount.toLocaleString()} test digits.`,
      );
    } catch (caught) {
      autoStartPending = false;
      if (!mountedRef.current) return;
      console.error('Perceptron demo could not load MNIST:', caught);
      setError(caught instanceof DatasetError ? caught.message : 'Something went wrong while loading MNIST.');
      setPhase('error');
    }
  }, [attach]);

  const loadAndTrain = useCallback(() => {
    autoStartPending = true;
    void load();
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    // Remounted while a download started by an earlier mount is still running: await it.
    if (!getCachedDataset() && isDatasetLoading()) void load();
    // The download that "Load MNIST & train" started finished while this was unmounted.
    if (getCachedDataset() && autoStartPending) {
      autoStartPending = false;
      setRunningState(true);
    }
    return () => {
      mountedRef.current = false;
    };
    // Mount-only: `load` is stable and phase is read from the module state directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;
    return subscribeToDatasetProgress(setProgress);
  }, [phase]);

  // Weight canvases mount with the ready UI (or on remount); paint the current model.
  useEffect(() => {
    if (phase === 'ready') paintAllWeights();
  }, [phase, paintAllWeights]);

  // The training loop: each animation frame trains a speed-dependent number of samples
  // (or, at Max, as many as fit in ~12 ms) and throttles repaints of weights and HUD.
  useEffect(() => {
    const trainer = trainerRef.current;
    if (!running || phase !== 'ready' || !trainer) return;

    let frame = 0;
    let previous = performance.now();
    let allowance = 0;
    let lastPaint = 0;
    let lastHud = 0;
    let weightsDirty = false;
    let hudDirty = false;
    let lastHistory = trainer.history;

    const loop = (time: number) => {
      if (!runningRef.current) return;
      const elapsed = Math.min(100, Math.max(0, time - previous));
      previous = time;
      const perSecond = SPEEDS[speedRef.current];
      const unlimited = !Number.isFinite(perSecond);

      let maxSamples = Number.POSITIVE_INFINITY;
      if (!unlimited) {
        allowance = Math.min(allowance + (elapsed * perSecond) / 1000, Math.max(1, perSecond / 10));
        maxSamples = Math.floor(allowance);
        allowance -= maxSamples;
      }

      if (trainer.run(maxSamples, unlimited ? 12 : 8) > 0) {
        weightsDirty = true;
        hudDirty = true;
      }
      if (trainer.history !== lastHistory) {
        lastHistory = trainer.history;
        hudDirty = true;
        const latest = lastHistory[lastHistory.length - 1];
        if (latest && latest.seen > 0 && latest.seen % trainer.trainCount === 0) {
          setAnnouncement(`Epoch ${latest.seen / trainer.trainCount} complete: test accuracy ${percent(latest.testAccuracy)}.`);
        }
      }

      const everySample = perSecond <= SPEEDS.normal;
      if (weightsDirty && (everySample || time - lastPaint >= 40)) {
        paintAllWeights();
        weightsDirty = false;
        lastPaint = time;
      }
      if (hudDirty && (everySample || time - lastHud >= 100)) {
        refresh();
        hudDirty = false;
        lastHud = time;
      }

      if (trainer.isFinished && !trainer.isEvaluating) {
        setRunningState(false);
        setAnnouncement(`Training finished after ${MAX_EPOCHS} epochs: test accuracy ${percent(trainer.lastEvaluation?.accuracy)}.`);
        return;
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      paintAllWeights();
      refresh();
    };
  }, [running, phase, paintAllWeights, refresh, setRunningState]);

  const ready = phase === 'ready' && hud !== null;

  const toggleRun = () => {
    if (phase !== 'ready') {
      loadAndTrain();
      return;
    }
    if (hud?.finished) return;
    setRunningState(!runningRef.current);
  };

  const stepOnce = () => {
    const trainer = trainerRef.current;
    if (!trainer) return;
    setRunningState(false);
    trainer.step();
    if (view === 'errors') setView('sample');
    paintAllWeights();
    refresh();
  };

  const resetModel = () => {
    const trainer = trainerRef.current;
    if (!trainer) return;
    setRunningState(false);
    trainer.reset();
    paintAllWeights();
    refresh();
    setAnnouncement('Model reset: every weight is back to zero.');
  };

  const changeRule = (rule: LearningRule) => {
    const trainer = trainerRef.current;
    if (!trainer || rule === trainer.rule) return;
    trainer.reset(rule);
    paintAllWeights();
    refresh();
    setAnnouncement(`Switched to the ${rule === 'perceptron' ? 'perceptron' : 'softmax'} rule; the model restarts from zero.`);
  };

  const closeInfo = useCallback(() => {
    setShowInfo(false);
    requestAnimationFrame(() => infoButtonRef.current?.focus());
  }, []);

  const dataset = trainerRef.current?.dataset ?? null;
  const rule = hud?.rule ?? 'perceptron';
  const outputMode = rule === 'softmax' ? 'probability' : 'score';
  const slowEnoughToHighlight = running ? SPEEDS[speed] <= SPEEDS.normal : true;
  const last = hud?.last ?? null;

  const drawnPrediction = useMemo(() => {
    const trainer = trainerRef.current;
    // `hud` changes whenever the weights do, so the drawing is re-scored as the model learns.
    if (!drawn || !trainer || !hud) return null;
    const scores = new Float32Array(CLASSES);
    const predicted = trainer.model.scoreVector(drawn, scores);
    return { predicted, scores, probabilities: softmaxInto(scores, new Float32Array(CLASSES)) };
  }, [drawn, hud]);

  const tileRing = (digit: number) => {
    if (!last || !last.updated || !slowEnoughToHighlight) return '';
    if (digit === last.label) return 'ring-2 ring-success';
    if (digit === last.predicted) return 'ring-2 ring-orange-500';
    return '';
  };

  const sampleCaption = () => {
    if (!last) return 'Press Train or Step. Each training image appears here with the ten neuron outputs.';
    const verdict = last.correct ? '✓' : '✗';
    if (rule === 'softmax') {
      return (
        <>
          Label <strong className="text-foreground">{last.label}</strong>, guessed{' '}
          <strong className="text-foreground">{last.predicted}</strong> {verdict} · p({last.label}) ={' '}
          {percent(last.probabilities[last.label], 0)} → every neuron nudged toward the label
        </>
      );
    }
    return (
      <>
        Label <strong className="text-foreground">{last.label}</strong>, guessed{' '}
        <strong className="text-foreground">{last.predicted}</strong> {verdict}{' '}
        {last.updated ? (
          <>
            → <span className="font-mono text-success">w{SUBSCRIPTS[last.label]} += x</span>,{' '}
            <span className="font-mono text-orange-500">w{SUBSCRIPTS[last.predicted]} −= x</span>
          </>
        ) : (
          '→ no change'
        )}
      </>
    );
  };

  const statusLine = hud
    ? hud.finished
      ? `Done · ${MAX_EPOCHS} epochs · ${hud.seen.toLocaleString()} seen · ${hud.updates.toLocaleString()} updates`
      : `Epoch ${hud.epoch}/${MAX_EPOCHS} · ${hud.seen.toLocaleString()} seen · ${hud.updates.toLocaleString()} updates`
    : `Epoch 0/${MAX_EPOCHS} · 0 seen · 0 updates`;

  const mistakes = hud?.evaluation?.mistakes.slice(0, MAX_ERROR_TILES) ?? [];

  return (
    <div
      className={cn(
        '@container relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground',
        className,
      )}
    >
      {/* Header: identity, learning rule, explanation */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <BrainCircuit aria-hidden="true" className="size-4 shrink-0 text-primary" />
        <h3 className="text-sm font-semibold">Perceptron</h3>
        <span className="hidden font-mono text-[10px] uppercase tracking-wide text-muted-foreground @md:inline">
          MNIST · 784 → 10
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <SegmentedControl label="Learning rule" options={RULE_OPTIONS} value={rule} onChange={changeRule} disabled={!ready} />
          <Button
            ref={infoButtonRef}
            variant="ghost"
            size="icon-xs"
            aria-label="How it works"
            title="How it works"
            onClick={() => setShowInfo(true)}
          >
            <Info />
          </Button>
        </div>
      </div>

      <div className="relative grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-3 @lg:grid-cols-[304px_minmax(0,1fr)] @lg:grid-rows-[auto_minmax(0,1fr)] @lg:content-stretch @lg:overflow-hidden">
        {/* Weight templates */}
        <section aria-labelledby="perceptron-weights" className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <h4 id="perceptron-weights" className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Weights · one neuron per digit
            </h4>
            <span aria-hidden="true" className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              −
              <span className="h-1.5 w-8 rounded-full bg-linear-to-r from-orange-600 via-transparent to-indigo-600 ring-1 ring-border dark:from-orange-400 dark:to-indigo-300" />
              +
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {DIGITS.map((digit) => (
              <figure key={digit} className="flex min-w-0 flex-col gap-0.5">
                <canvas
                  ref={(element) => {
                    weightCanvasesRef.current[digit] = element;
                  }}
                  width={dataset?.cols ?? 28}
                  height={dataset?.rows ?? 28}
                  role="img"
                  aria-label={`Weights of the neuron for digit ${digit}`}
                  className={cn(
                    'aspect-square w-full rounded-md bg-muted [image-rendering:pixelated] ring-offset-1 ring-offset-card',
                    tileRing(digit),
                  )}
                />
                <figcaption className="flex items-baseline justify-between font-mono text-[10px] leading-none">
                  <span className="font-semibold text-foreground">{digit}</span>
                  <span className="tabular-nums text-muted-foreground" title={`Test accuracy on ${digit}s`}>
                    {percent(hud?.evaluation?.perClass[digit], 0)}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Inspector: live sample, drawing pad, test errors */}
        <section aria-label="Inspect the model" className="flex min-w-0 flex-col gap-2">
          <div role="tablist" aria-label="Inspector view" className="flex items-center gap-1">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={view === item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  'h-6 rounded-md px-2 text-[11px] font-medium transition-colors duration-150',
                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                  view === item.id ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" aria-label={VIEWS.find((item) => item.id === view)?.label} className="flex min-w-0 flex-col gap-2">
            {view === 'sample' && (
              <>
                <div className="flex gap-3">
                  <DigitCanvas
                    source={last && dataset ? dataset.train.images : null}
                    offset={last && dataset ? last.index * dataset.pixels : 0}
                    label={last ? `Training image of a ${last.label}` : undefined}
                    className="size-[84px] shrink-0 @max-md:size-[72px]"
                  />
                  <ScoreBars
                    values={last ? (outputMode === 'probability' ? last.probabilities : last.scores) : null}
                    mode={outputMode}
                    predicted={last?.predicted ?? null}
                    label={last?.label ?? null}
                    className="h-[84px] flex-1 @max-md:h-[72px]"
                  />
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground" aria-live="off">
                  {sampleCaption()}
                </p>
              </>
            )}

            {view === 'draw' && (
              <>
                <div className="flex gap-3">
                  <DrawPad ref={drawPadRef} onChange={setDrawn} className="size-[96px] shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
                    <ScoreBars
                      values={drawnPrediction ? (outputMode === 'probability' ? drawnPrediction.probabilities : drawnPrediction.scores) : null}
                      mode={outputMode}
                      predicted={drawnPrediction?.predicted ?? null}
                      className="h-[62px]"
                    />
                    <div className="flex items-center gap-1.5">
                      <DigitCanvas
                        source={drawn}
                        label={drawn ? 'What the model sees: your digit scaled and centred in 28×28 pixels, like MNIST' : undefined}
                        className="size-7 shrink-0"
                      />
                      <span
                        className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground"
                        title="What the model sees: your drawing scaled and centred like an MNIST digit"
                      >
                        28×28 input
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => drawPadRef.current?.clear()}
                        disabled={!drawn}
                        aria-label="Clear drawing"
                        title="Clear drawing"
                      >
                        <Eraser />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground" aria-live="polite">
                  {drawnPrediction ? (
                    <>
                      The model reads a <strong className="text-foreground">{drawnPrediction.predicted}</strong>
                      {outputMode === 'probability' && ` (${percent(drawnPrediction.probabilities[drawnPrediction.predicted], 0)})`}
                      {hud && hud.seen === 0 ? '. Untrained weights always say 0, so train it first.' : '. Keep training and watch it change its mind.'}
                    </>
                  ) : (
                    'Draw a digit from 0 to 9 in the black square.'
                  )}
                </p>
              </>
            )}

            {view === 'errors' &&
              (mistakes.length > 0 && dataset ? (
                <>
                  <ul className="grid grid-cols-6 gap-1.5" aria-label="Misclassified test digits">
                    {mistakes.map((mistake) => (
                      <li key={mistake.index} className="flex flex-col items-center gap-0.5">
                        <DigitCanvas
                          source={dataset.test.images}
                          offset={mistake.index * dataset.pixels}
                          label={`A ${mistake.label} the model reads as ${mistake.predicted}`}
                          className="aspect-square w-full"
                        />
                        <span className="font-mono text-[10px] leading-none tabular-nums text-muted-foreground" aria-hidden="true">
                          <span className="text-success">{mistake.label}</span>→<span className="text-orange-500">{mistake.predicted}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Held-out digits the model currently gets wrong (true → guess). Many are genuinely ambiguous.
                  </p>
                </>
              ) : (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {hud?.evaluation ? 'No test errors: remarkable.' : 'Test errors appear here once the model has been evaluated.'}
                </p>
              ))}
          </div>
        </section>

        {/* Learning curve */}
        <section aria-label="Accuracy" className="flex min-h-[124px] flex-col gap-1 @max-md:min-h-[108px] @lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-primary" />
                Test <strong className="font-mono tabular-nums text-foreground">{percent(hud?.evaluation?.accuracy)}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground" title={`Accuracy on the last ${RECENT_WINDOW} training samples, measured before each update`}>
                <span aria-hidden="true" className="w-3 border-t border-dashed border-muted-foreground" />
                Train <strong className="font-mono tabular-nums text-foreground">{percent(hud?.trainAccuracy)}</strong>
              </span>
            </div>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{statusLine}</span>
          </div>
          <AccuracyChart history={hud?.history ?? []} seen={hud?.seen ?? 0} trainCount={DATASET_MANIFEST.trainCount} />
          <div
            role="progressbar"
            aria-label="Progress through the current epoch"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((hud?.epochProgress ?? 0) * 100)}
            className="h-1 shrink-0 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${(hud?.epochProgress ?? 0) * 100}%` }} />
          </div>
        </section>
      </div>

      {/* Controls */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border px-3 py-2">
        <Button size="sm" onClick={toggleRun} disabled={phase === 'loading' || hud?.finished} className="w-[88px]">
          {running ? <Pause /> : <Play />}
          {running ? 'Pause' : 'Train'}
        </Button>
        <Button size="sm" variant="outline" onClick={stepOnce} disabled={!ready || hud?.finished} title="Train on exactly one image" className="@max-md:px-2">
          <StepForward />
          <span className="@max-md:sr-only">Step</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={resetModel} disabled={!ready || hud?.seen === 0} title="Set every weight back to zero" className="@max-md:px-2">
          <RotateCcw />
          <span className="@max-md:sr-only">Reset</span>
        </Button>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground @max-md:hidden">Speed</span>
          <SegmentedControl label="Training speed" options={SPEED_OPTIONS} value={speed} onChange={setSpeed} />
        </div>
      </div>

      {/* Intro / loading / error */}
      {phase !== 'ready' && (
        <div className="absolute inset-x-0 top-10 bottom-0 z-20 flex items-center justify-center bg-card/75 p-4 backdrop-blur-[3px]">
          <div className="w-full max-w-[340px] rounded-xl border border-border bg-card p-4 shadow-lg">
            {phase === 'intro' && (
              <>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Live demo · real data</p>
                <h4 className="mt-1.5 text-base font-semibold leading-snug">Watch a perceptron learn to read handwriting</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Ten artificial neurons learn to tell 0–9 apart from {DATASET_MANIFEST.trainCount.toLocaleString()} real MNIST
                  digits, then get graded on {DATASET_MANIFEST.testCount.toLocaleString()} they have never seen. No server, no ML
                  library: it all runs in your browser.
                </p>
                <Button size="sm" className="mt-3 w-full" onClick={loadAndTrain}>
                  <Download />
                  Load MNIST &amp; train
                </Button>
                <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
                  {(DATASET_MANIFEST.compressedBytes / MB).toFixed(1)} MB download · MNIST, CC BY-SA 3.0
                </p>
              </>
            )}

            {phase === 'loading' && (
              <div role="status" aria-live="polite">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-primary motion-reduce:animate-none" />
                  {STAGE_LABEL[progress?.stage ?? 'download']}…
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-150 motion-reduce:transition-none"
                    style={{
                      width: `${progress ? (progress.stage === 'download' ? Math.min(100, (progress.loaded / Math.max(1, progress.total)) * 100) : 100) : 2}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {progress?.stage === 'download'
                    ? `${(progress.loaded / MB).toFixed(2)} / ${(progress.total / MB).toFixed(2)} MB`
                    : progress
                      ? `${(DATASET_MANIFEST.rawBytes / MB).toFixed(1)} MB of pixels · ${(DATASET_MANIFEST.trainCount + DATASET_MANIFEST.testCount).toLocaleString()} images`
                      : 'Connecting…'}
                </p>
              </div>
            )}

            {phase === 'error' && (
              <div role="alert">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <TriangleAlert aria-hidden="true" className="size-4 text-destructive" />
                  MNIST did not load
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{error}</p>
                <Button size="sm" variant="outline" className="mt-3 w-full" onClick={loadAndTrain}>
                  <RotateCcw />
                  Retry
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {showInfo && <PerceptronInfo onClose={closeInfo} />}

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
