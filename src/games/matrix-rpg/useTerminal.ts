import { useCallback, useRef, useState } from 'react';
import type React from 'react';
import { damerauLevenshtein, type TerminalCommand } from './commands';

export type { TerminalCommand } from './commands';

export interface UseTerminalOptions {
  commands: TerminalCommand[];
  input: string;
  isProcessing: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onAbort: () => void;
}

export interface UseTerminalResult {
  suggestions: TerminalCommand[];
  completionMessage: string | null;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  recordCommand: (command: string) => void;
  clearCompletion: () => void;
}

export const findClosestCommand = (input: string, commands: TerminalCommand[]): TerminalCommand | null => {
  const token = input.trim().toLowerCase();
  if (!token || /\s/.test(token)) return null;

  let best: { command: TerminalCommand; distance: number } | null = null;
  for (const command of commands) {
    const distance = damerauLevenshtein(token, command.name);
    if (!best || distance < best.distance) {
      best = { command, distance };
    }
  }

  return best && best.distance <= Math.max(1, Math.floor(best.command.name.length / 3)) ? best.command : null;
};

export function useTerminal({
  commands,
  input,
  isProcessing,
  onInputChange,
  onSubmit,
  onAbort,
}: UseTerminalOptions): UseTerminalResult {
  const [suggestions, setSuggestions] = useState<TerminalCommand[]>([]);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number | null>(null);

  const clearCompletion = useCallback(() => {
    setSuggestions([]);
    setCompletionMessage(null);
  }, []);

  const recordCommand = useCallback((command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;
    historyRef.current = [...historyRef.current.filter(item => item !== trimmed), trimmed].slice(-40);
    historyIndexRef.current = null;
  }, []);

  const handleHistory = useCallback((direction: 'previous' | 'next') => {
    const history = historyRef.current;
    if (history.length === 0) return;

    if (direction === 'previous') {
      const nextIndex = historyIndexRef.current === null
        ? history.length - 1
        : Math.max(0, historyIndexRef.current - 1);
      historyIndexRef.current = nextIndex;
      onInputChange(history[nextIndex]);
      clearCompletion();
      return;
    }

    if (historyIndexRef.current === null) return;
    const nextIndex = historyIndexRef.current + 1;
    if (nextIndex >= history.length) {
      historyIndexRef.current = null;
      onInputChange('');
    } else {
      historyIndexRef.current = nextIndex;
      onInputChange(history[nextIndex]);
    }
    clearCompletion();
  }, [clearCompletion, onInputChange]);

  const handleTab = useCallback(() => {
    const prefix = input.trim().toLowerCase();
    const candidates = commands.flatMap(command =>
      [command.name, ...(command.aliases ?? [])].map(token => ({ token, command })));
    const matches = candidates.filter(({ token }) => token.startsWith(prefix));

    if (matches.length === 1) {
      onInputChange(matches[0].token);
      setSuggestions([]);
      setCompletionMessage(`[COMPLETE] ${matches[0].token} — ${matches[0].command.description}`);
      return;
    }

    if (matches.length > 1) {
      const uniqueCommands = [...new Set(matches.map(match => match.command))];
      setSuggestions(uniqueCommands);
      setCompletionMessage(`[TAB] Multiple matches: ${matches.map(match => match.token).join(', ')}`);
      return;
    }

    const closest = findClosestCommand(prefix, commands);
    setSuggestions([]);
    setCompletionMessage(closest ? `[HINT] Did you mean '${closest.name}'?` : `[TAB] No command matches '${prefix || '<empty>'}'.`);
  }, [commands, input, onInputChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.ctrlKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      clearCompletion();
      onAbort();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setHelpOpen(false);
      clearCompletion();
      return;
    }

    if (event.key === '?' && input.length === 0) {
      event.preventDefault();
      setHelpOpen(open => !open);
      clearCompletion();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      handleHistory('previous');
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      handleHistory('next');
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      handleTab();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey && !isProcessing) {
      event.preventDefault();
      const submitted = input.trim();
      if (submitted) recordCommand(submitted);
      clearCompletion();
      onSubmit();
    }
  }, [clearCompletion, handleHistory, handleTab, input, isProcessing, onAbort, onSubmit, recordCommand]);

  return {
    suggestions,
    completionMessage,
    helpOpen,
    setHelpOpen,
    handleKeyDown,
    recordCommand,
    clearCompletion,
  };
}
