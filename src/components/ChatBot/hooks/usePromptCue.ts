import { useCallback, useMemo, useState } from 'react';

import type { ChatBotMode } from '../types';

export interface UsePromptCueOptions {
  /**
   * The prompt cue is intentionally one-shot for this active page session.
   * It starts visible so the closed trigger can render the integrated badge/ring
   * from Phase 1.13 without reintroducing periodic pop-ins or announcements.
   */
  initiallyVisible?: boolean;
}

export interface UsePromptCueResult {
  showPromptCue: boolean;
  dismissPromptCue: () => void;
  resetPromptCueForSession: () => void;
}

export const usePromptCue = (
  mode: ChatBotMode,
  options: UsePromptCueOptions = {},
): UsePromptCueResult => {
  const { initiallyVisible = true } = options;
  const [hasDismissedCue, setHasDismissedCue] = useState(!initiallyVisible);
  const isCueEligible = mode !== 'open';

  const dismissPromptCue = useCallback(() => {
    setHasDismissedCue(true);
  }, []);

  const resetPromptCueForSession = useCallback(() => {
    setHasDismissedCue(false);
  }, []);

  return useMemo(() => ({
    showPromptCue: isCueEligible && !hasDismissedCue,
    dismissPromptCue,
    resetPromptCueForSession,
  }), [dismissPromptCue, hasDismissedCue, isCueEligible, resetPromptCueForSession]);
};

export default usePromptCue;
