import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CrtIntensity, GameState, TerminalStatus, UserSelectableCrtIntensity } from './types';
import MatrixRPGCanvas from './MatrixRPGCanvas';
import CrtEffects from './CrtEffects';
import { useTerminal, type TerminalCommand } from './useTerminal';

interface Props {
  content: string;
  gameState: GameState;
  terminalStatus: TerminalStatus;
  userInput: string;
  isProcessing: boolean;
  commands: TerminalCommand[];
  preferredIntensity: UserSelectableCrtIntensity;
  effectiveIntensity: CrtIntensity;
  isCrtOverridden: boolean;
  crtOverrideReason: string | null;
  onInputChange: (input: string) => void;
  onSubmit: () => void;
  onAbort: () => void;
  onCycleIntensity: () => void;
}

const isMobileInputEnvironment = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 640px)').matches;
};

const getCrtLabel = (intensity: CrtIntensity) => {
  switch (intensity) {
    case 0:
      return 'OFF';
    case 1:
      return 'SOBER';
    case 2:
      return 'SCREEN';
    case 3:
      return 'ARCADE';
  }
};

export default function MatrixRPGTerminal({
  content,
  gameState,
  terminalStatus,
  userInput,
  isProcessing,
  commands,
  preferredIntensity,
  effectiveIntensity,
  isCrtOverridden,
  crtOverrideReason,
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
    onKeyDown: terminal.handleKeyDown,
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
        width={dimensions.width}
        height={dimensions.height}
        gameState={gameState}
        userInput={userInput}
        isFocused={isFocused}
        terminalStatus={terminalStatus}
        completionMessage={terminal.completionMessage}
        suggestions={terminal.suggestions}
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
        <div className="matrix-rpg-help-panel" role="dialog" aria-modal="false" aria-label="Terminal help and CRT settings" onClick={event => event.stopPropagation()}>
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
              <h3>AI/NPC</h3>
              <p>Unknown Entity responses are streamed through an external AI service. Do not type secrets.</p>
              <p>Scrollback preserves your reading position; use the bottom affordance when new output arrives.</p>
            </section>
          </div>
        </div>
      )}

      <div className="sr-only" role={terminalStatus === 'error' ? 'alert' : 'status'} aria-live="polite">
        {statusText}
      </div>
    </div>
  );
}
