import { useEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SOFTMAX_LEARNING_RATE } from './model';

interface Props {
  onClose: () => void;
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="space-y-0.5">
      <h5 className="text-xs font-semibold text-foreground">{title}</h5>
      <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
    </li>
  );
}

const Formula = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-muted px-1 py-px font-mono text-[11px] whitespace-nowrap text-foreground">{children}</code>
);

/** "How it works" sheet laid over the demo. Escape or the close button dismisses it. */
export default function PerceptronInfo({ onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="perceptron-info-title"
      onKeyDown={handleKeyDown}
      className="absolute inset-0 z-30 flex flex-col bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h4 id="perceptron-info-title" className="text-sm font-semibold">
          How the perceptron learns
        </h4>
        <Button ref={closeRef} variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close explanation">
          <X />
        </Button>
      </div>

      <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <Step title="1 · Input">
          Each digit is a 28×28 grid of grey pixels. Flattened and scaled to 0–1, it becomes a vector <Formula>x</Formula> of
          784 numbers.
        </Step>
        <Step title="2 · Ten neurons, one per digit">
          Neuron <Formula>k</Formula> holds 784 weights <Formula>w<sub>k</sub></Formula> and a bias <Formula>b<sub>k</sub></Formula>. Its score{' '}
          <Formula>s<sub>k</sub> = w<sub>k</sub> · x + b<sub>k</sub></Formula> is a weighted vote of the inked pixels. The prediction is whichever neuron scores
          highest.
        </Step>
        <Step title="3 · Perceptron rule (Rosenblatt, 1958)">
          If the guess <Formula>ŷ</Formula> is wrong, add the image to the right neuron and subtract it from the wrong one:{' '}
          <Formula>w<sub>y</sub> ← w<sub>y</sub> + x</Formula>, <Formula>w<sub>ŷ</sub> ← w<sub>ŷ</sub> − x</Formula>. Correct guesses change nothing, which is why the
          “updates” counter grows slower than “seen”. There is no learning rate: starting from zero, scaling every step by
          the same factor would scale all weights alike and never change a prediction.
        </Step>
        <Step title="4 · Softmax rule (gradient descent)">
          Scores become probabilities <Formula>p = softmax(s)</Formula>, and every sample nudges every neuron:{' '}
          <Formula>w<sub>k</sub> ← w<sub>k</sub> − η (p<sub>k</sub> − [k = y]) x</Formula> with <Formula>η = {SOFTMAX_LEARNING_RATE}</Formula>. That is one step
          of gradient descent on cross-entropy loss, the same update deep networks use for every layer.
        </Step>
        <Step title="5 · Reading the weight maps">
          Indigo pixels raise that digit’s score when they are inked; orange pixels lower it. Blurry templates of each
          digit appear within a few hundred samples. Run at 3/s to watch single updates: the true digit’s tile is outlined
          in green (<Formula>+x</Formula>), the wrong guess in orange (<Formula>−x</Formula>).
        </Step>
        <Step title="6 · Why ~88% and not 99%?">
          A single layer draws straight (linear) boundaries: one template per digit. Sloppy 4s and 9s look alike to it.
          Hidden layers and convolutions are what push MNIST past 99%. On data that cannot be separated perfectly the
          perceptron never settles, so its test accuracy keeps jumping around; softmax’s smaller steps usually keep it a little steadier.
        </Step>
        <Step title="Data">
          10,000 training and 2,000 test images, sampled evenly per digit from the official MNIST train and test splits
          (LeCun, Cortes &amp; Burges, CC BY-SA 3.0). The chart’s test accuracy is measured on digits the model never
          trains on; the dashed line is its accuracy on the last 500 training samples, before each update.
        </Step>
      </ol>
    </div>
  );
}
