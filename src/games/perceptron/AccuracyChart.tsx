import { useElementSize } from '@/hooks/useElementSize';
import type { HistoryPoint } from './trainer';

interface Props {
  history: HistoryPoint[];
  seen: number;
  trainCount: number;
}

const PAD = { top: 6, right: 8, bottom: 14, left: 28 };
const GRID = [0.25, 0.5, 0.75, 1];

const formatSamples = (value: number) => (value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value));

/** Test and training accuracy against samples seen; the first epoch spans the full width. */
export default function AccuracyChart({ history, seen, trainCount }: Props) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const latest = history.length > 0 ? history[history.length - 1] : undefined;

  const domain = Math.max(trainCount, seen, 1);
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = Math.max(0, height - PAD.top - PAD.bottom);
  const x = (samples: number) => PAD.left + (samples / domain) * innerW;
  const y = (accuracy: number) => PAD.top + (1 - accuracy) * innerH;

  const testPath = history.map((point) => `${x(point.seen).toFixed(1)},${y(point.testAccuracy).toFixed(1)}`).join(' ');
  const trainPath = history
    .filter((point) => point.trainAccuracy !== null)
    .map((point) => `${x(point.seen).toFixed(1)},${y(point.trainAccuracy!).toFixed(1)}`)
    .join(' ');

  const epochs = Math.floor(seen / trainCount);
  const epochSpacing = (trainCount / domain) * innerW;
  const epochLines = epochSpacing >= 14 ? Array.from({ length: epochs }, (_, i) => (i + 1) * trainCount) : [];

  const label = latest
    ? `Test accuracy ${(latest.testAccuracy * 100).toFixed(1)}% after ${latest.seen.toLocaleString()} training samples.`
    : 'No accuracy measured yet.';

  return (
    <div ref={ref} className="relative min-h-0 flex-1" role="img" aria-label={label}>
      {width > 0 && height > 0 && (
        <svg width={width} height={height} className="absolute inset-0 overflow-visible" aria-hidden="true">
          {GRID.map((value) => (
            <g key={value}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(value)}
                y2={y(value)}
                className="stroke-border"
                strokeWidth={1}
                strokeDasharray={value === 1 ? undefined : '2 3'}
              />
              <text
                x={PAD.left - 5}
                y={y(value)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground font-mono text-[9px] tabular-nums"
              >
                {value * 100}%
              </text>
            </g>
          ))}
          <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} className="stroke-border" strokeWidth={1} />

          {epochLines.map((samples) => (
            <g key={samples}>
              <line x1={x(samples)} x2={x(samples)} y1={PAD.top} y2={y(0)} className="stroke-foreground/15" strokeWidth={1} />
              <text x={x(samples) - 3} y={PAD.top + 7} textAnchor="end" className="fill-muted-foreground font-mono text-[8px]">
                E{samples / trainCount}
              </text>
            </g>
          ))}

          <text x={PAD.left} y={y(0) + 10} className="fill-muted-foreground font-mono text-[8px]">
            0
          </text>
          <text x={width - PAD.right} y={y(0) + 10} textAnchor="end" className="fill-muted-foreground font-mono text-[8px]">
            {formatSamples(domain)} samples
          </text>

          {trainPath && (
            <polyline
              points={trainPath}
              fill="none"
              className="stroke-muted-foreground/70"
              strokeWidth={1.25}
              strokeDasharray="3 2"
              strokeLinejoin="round"
            />
          )}
          {testPath && (
            <polyline points={testPath} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          )}
          {latest && <circle cx={x(latest.seen)} cy={y(latest.testAccuracy)} r={3} className="fill-primary stroke-card" strokeWidth={1.5} />}
        </svg>
      )}

      {!latest && (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-muted-foreground">
          Accuracy on held-out test digits is plotted here as the model trains.
        </p>
      )}
    </div>
  );
}
