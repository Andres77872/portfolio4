import { useCallback, useMemo, useReducer } from 'react';
import type { Dispatch } from 'react';

import type { ChatBotMode, ChatBotUiAction, ChatBotUiState } from '../types';

const initialChatUiState: ChatBotUiState = {
  mode: 'closed',
  showResetConfirmation: false,
};

const createState = (mode: ChatBotMode, showResetConfirmation = false): ChatBotUiState => ({
  mode,
  showResetConfirmation: mode === 'open' && showResetConfirmation,
});

export const chatUiReducer = (
  state: ChatBotUiState,
  action: ChatBotUiAction,
): ChatBotUiState => {
  switch (action.type) {
    case 'OPEN':
      return createState('open');

    case 'MINIMIZE':
      return createState('minimized');

    case 'CLOSE':
      return createState('closed');

    case 'TOGGLE_FROM_TRIGGER': {
      if (state.mode === 'open') {
        return createState('minimized');
      }

      if (state.mode === 'minimized') {
        return createState('open');
      }

      return createState('open');
    }

    case 'SHOW_RESET_CONFIRMATION':
      return createState(state.mode, state.mode === 'open');

    case 'HIDE_RESET_CONFIRMATION':
      return createState(state.mode);

    default: {
      const exhaustiveAction: never = action;
      return exhaustiveAction;
    }
  }
};

export interface UseChatUiStateResult {
  state: ChatBotUiState;
  mode: ChatBotMode;
  isOpen: boolean;
  isMinimized: boolean;
  showResetConfirmation: boolean;
  openChat: () => void;
  minimizeChat: () => void;
  closeChat: () => void;
  toggleFromTrigger: () => void;
  showResetConfirmationPrompt: () => void;
  hideResetConfirmationPrompt: () => void;
  dispatch: Dispatch<ChatBotUiAction>;
}

export const useChatUiState = (
  initialState: ChatBotUiState = initialChatUiState,
): UseChatUiStateResult => {
  const [state, dispatch] = useReducer(chatUiReducer, initialState, (providedState) =>
    createState(providedState.mode, providedState.showResetConfirmation),
  );

  const openChat = useCallback(() => {
    dispatch({ type: 'OPEN' });
  }, []);

  const minimizeChat = useCallback(() => {
    dispatch({ type: 'MINIMIZE' });
  }, []);

  const closeChat = useCallback(() => {
    dispatch({ type: 'CLOSE' });
  }, []);

  const toggleFromTrigger = useCallback(() => {
    dispatch({ type: 'TOGGLE_FROM_TRIGGER' });
  }, []);

  const showResetConfirmationPrompt = useCallback(() => {
    dispatch({ type: 'SHOW_RESET_CONFIRMATION' });
  }, []);

  const hideResetConfirmationPrompt = useCallback(() => {
    dispatch({ type: 'HIDE_RESET_CONFIRMATION' });
  }, []);

  return useMemo(() => ({
    state,
    mode: state.mode,
    isOpen: state.mode !== 'closed',
    isMinimized: state.mode === 'minimized',
    showResetConfirmation: state.showResetConfirmation,
    openChat,
    minimizeChat,
    closeChat,
    toggleFromTrigger,
    showResetConfirmationPrompt,
    hideResetConfirmationPrompt,
    dispatch,
  }), [
    closeChat,
    hideResetConfirmationPrompt,
    minimizeChat,
    openChat,
    showResetConfirmationPrompt,
    state,
    toggleFromTrigger,
  ]);
};

export default useChatUiState;
