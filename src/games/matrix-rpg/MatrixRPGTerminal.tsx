import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CrtIntensity, GameState, TerminalStatus, UserSelectableCrtIntensity } from './types';
import MatrixRPGCanvas from './MatrixRPGCanvas';
import CrtEffects from './CrtEffects';
import { useTerminal, type TerminalCommand } from './useTerminal';
import { getCrtLabel } from './crtLabels';

interface Props {
  content: string;
  promptPrefix: string;
  gameState: GameState;
  terminalStatus: TerminalStatus;
  userInput: string;
  isProcessing: boolean;
  commands: TerminalCommand[];
  announcements: string[];
  preferredIntensity: UserSelectableCrtIntensity;
  effectiveIntensity: CrtIntensity;
  isCrtOverridden: boolean;
  crtOverrideReason: string | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onKeyPress: () => void;
  onMetrics: (metrics: { cols: number }) => void;
  onInputChange: (input: string) => void;
  onSubmit: () => void;
  onAbort: () => void;
  onCycleIntensity: () => void;
}

/** Space the on-screen mobile textarea covers at the bottom (8px offset + 34px + gap). */
const MOBILE_INPUT_INSET = 48;

const isMobileInputEnvironment = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 640px)').matches;
};

export default function MatrixRPGTerminal({
  content,
  promptPrefix,
  gameState,
  terminalStatus,
  userInput,
  isProcessing,
  commands,
  announcements,
  preferredIntensity,
  effectiveIntensity,
  isCrtOverridden,
  crtOverrideReason,
  soundEnabled,
  onToggleSound,
  onKeyPress,
  onMetrics,
  onInputChange,
  onSubmit,
  onAbort,
  onCycleIntensity,
}: Props) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isMobileInput, setIsMobileInput] = useState(isMobileInputEnvironment);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const helpPanelRef = useRef<HTMLDivElement>(null);

  const terminal = useTerminal({
    commands,
    input: userInput,
    isProcessing,
    onInputChange,
    onSubmit,
    onAbort,
  });

  const focusInput = useCallback(() => {
    if (gameState !== 'interactive') return;
    requestAnimationFrame(() => {
      const target = isMobileInput ? textareaRef.current : inputRef.current;
      target?.focus();
    });
  }, [gameState, isMobileInput]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const node = containerRef.current;
      if (!node) return;
      setDimensions({
        width: Math.max(1, node.clientWidth),
        height: Math.max(1, node.clientHeight),
      });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const coarse = window.matchMedia('(pointer: coarse)');
    const narrow = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobileInput(isMobileInputEnvironment());

    [coarse, narrow].forEach(query => {
      if (typeof query.addEventListener === 'function') query.addEventListener('change', update);
      else query.addListener(update);
    });

    return () => {
      [coarse, narrow].forEach(query => {
        if (typeof query.removeEventListener === 'function') query.removeEventListener('change', update);
        else query.removeListener(update);
      });
    };
  }, []);

  useEffect(() => {
    if (gameState === 'interactive' && !terminal.helpOpen) {
      const timer = window.setTimeout(focusInput, 100);
      return () => window.clearTimeout(timer);
    }
  }, [focusInput, gameState, terminal.helpOpen]);

  useEffect(() => {
    if (!terminal.helpOpen) focusInput();
  }, [focusInput, terminal.helpOpen]);

  // Move focus into the help/settings dialog when it opens (focus is restored to
  // the terminal input by the effect above when it closes).
  useEffect(() => {
    if (!terminal.helpOpen) return;
    const first = helpPanelRef.current?.querySelector<HTMLElement>('button');
    first?.focus();
  }, [terminal.helpOpen]);

  const handlePanelKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        terminal.setHelpOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = helpPanelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [terminal],
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key.length === 1 || event.key === 'Enter' || event.key === 'Backspace') onKeyPress();
      terminal.handleKeyDown(event);
    },
    [onKeyPress, terminal],
  );

  const statusText = useMemo(() => {
    if (terminalStatus === 'connecting') return 'Connecting to Unknown Entity. Ctrl+C interrupts.';
    if (terminalStatus === 'streaming') return 'Unknown Entity stream active. Ctrl+C interrupts.';
    if (terminalStatus === 'aborted') return 'Neural transmission interrupted.';
    if (terminalStatus === 'error') return 'Neural interface error. Prompt restored.';
    if (terminal.helpOpen) return 'Help and CRT settings open. Escape closes.';
    return 'Terminal ready.';
  }, [terminal.helpOpen, terminalStatus]);

  const sharedInputProps = {
    value: userInput,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onInputChange(event.target.value),
    onKeyDown: handleInputKeyDown,
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    disabled: gameState !== 'interactive',
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    'aria-label': 'Matrix RPG terminal input',
  } as const;

  return (
    <div className="matrix-rpg-terminal" ref={containerRef} onClick={focusInput}>
      {!isMobileInput && (
        <input ref={inputRef} type="text" className="matrix-rpg-hidden-input" {...sharedInputProps} />
      )}

      {isMobileInput && (
        <textarea
          ref={textareaRef}
          className="matrix-rpg-mobile-textarea"
          inputMode="text"
          rows={1}
          {...sharedInputProps}
        />
      )}

      <MatrixRPGCanvas
        content={content}
        promptPrefix={promptPrefix}
        width={dimensions.width}
        height={dimensions.height}
        gameState={gameState}
        userInput={userInput}
        isFocused={isFocused}
        terminalStatus={terminalStatus}
        completionMessage={terminal.completionMessage}
        suggestions={terminal.suggestions}
        onMetrics={onMetrics}
        bottomInset={isMobileInput ? MOBILE_INPUT_INSET : 0}
      />

      <CrtEffects />

      <button
        type="button"
        className="matrix-rpg-help-trigger"
        onClick={(event) => {
          event.stopPropagation();
          terminal.setHelpOpen(true);
        }}
        aria-label="Open terminal help and CRT settings"
      >
        ?
      </button>

      {terminal.helpOpen && (
        <div
          ref={helpPanelRef}
          className="matrix-rpg-help-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Terminal help and CRT settings"
          onClick={event => event.stopPropagation()}
          onKeyDown={handlePanelKeyDown}
        >
          <div className="matrix-rpg-help-panel__header">
            <span>NXTERM HELP / SETTINGS</span>
            <button type="button" onClick={() => terminal.setHelpOpen(false)}>Esc</button>
          </div>

          <div className="matrix-rpg-help-panel__grid">
            <section>
              <h3>Commands</h3>
              <ul>
                {commands.map(command => (
                  <li key={command.name}><code>{command.name}</code> — {command.description}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3>Shortcuts</h3>
              <ul>
                <li><code>↑/↓</code> command history</li>
                <li><code>Tab</code> complete command; multiple matches list choices</li>
                <li><code>Ctrl+C</code> interrupt active neural stream</li>
                <li><code>Esc</code> close help or clear suggestions</li>
              </ul>
            </section>

            <section>
              <h3>CRT</h3>
              <p>Current: <strong>{getCrtLabel(effectiveIntensity)}</strong>{isCrtOverridden ? ` — OS override: ${crtOverrideReason}` : ''}</p>
              <p>Stored preference: tier {preferredIntensity}</p>
              <button type="button" className="matrix-rpg-crt-cycle" onClick={onCycleIntensity}>Cycle CRT 1 → 2 → 3</button>
            </section>

            <section>
              <h3>Sound</h3>
              <p>Retro audio: key clicks, entity bell, error tones.</p>
              <button
                type="button"
                className={`matrix-rpg-sound-toggle ${soundEnabled ? 'is-on' : ''}`}
                onClick={onToggleSound}
                aria-pressed={soundEnabled}
              >
                Sound: {soundEnabled ? 'ON' : 'OFF'}
              </button>
            </section>

            <section>
              <h3>AI/NPC</h3>
              <p>Unknown Entity responses are streamed through an external AI service. Do not type secrets.</p>
              <p>Explore <code>/mirror</code> with <code>ls</code>/<code>cat</code>, then talk to the Entity by just typing.</p>
            </section>
          </div>
        </div>
      )}

      <div className="sr-only" role={terminalStatus === 'error' ? 'alert' : 'status'} aria-live="polite">
        {statusText}
      </div>

      <div className="sr-only" role="log" aria-live="polite" aria-label="Unknown Entity transcript">
        {announcements.map((line, index) => (
          <p key={`${index}-${line.slice(0, 12)}`}>{line}</p>
        ))}
      </div>
    </div>
  );
}
