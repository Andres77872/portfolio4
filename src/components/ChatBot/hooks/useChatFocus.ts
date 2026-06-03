import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';

import type { ChatBotMode } from '../types';

const MODAL_FOCUS_SELECTOR = '[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]';

const isHTMLElement = (element: Element | EventTarget | null): element is HTMLElement =>
  element instanceof HTMLElement;

const isDisabledElement = (element: HTMLElement): boolean =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';

const getToggleButton = (toggleRoot: HTMLElement | null): HTMLButtonElement | null =>
  toggleRoot?.querySelector('button') ?? null;

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!isHTMLElement(target)) {
    return false;
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
};

const hasExternalModalFocus = (chatbotRoot: HTMLElement | null): boolean => {
  if (typeof document === 'undefined') {
    return false;
  }

  const activeElement = document.activeElement;

  if (!isHTMLElement(activeElement)) {
    return false;
  }

  if (chatbotRoot?.contains(activeElement)) {
    return false;
  }

  return Boolean(activeElement.closest(MODAL_FOCUS_SELECTOR));
};

export interface UseChatFocusOptions {
  mode: ChatBotMode;
  onEscapeClose: () => void;
}

export interface UseChatFocusResult {
  inputRef: RefObject<HTMLTextAreaElement>;
  rootRef: RefObject<HTMLDivElement>;
  panelRef: RefObject<HTMLDivElement>;
  toggleRootRef: RefObject<HTMLDivElement>;
  rememberOpenerElement: () => void;
  focusComposerOrPanel: () => void;
  restoreFocusToOpener: () => void;
  handlePanelEscapeKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  shouldIgnoreToggleShortcut: (event: KeyboardEvent | ReactKeyboardEvent) => boolean;
}

export const useChatFocus = ({
  mode,
  onEscapeClose,
}: UseChatFocusOptions): UseChatFocusResult => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRootRef = useRef<HTMLDivElement>(null);
  const openerElementRef = useRef<HTMLElement | null>(null);
  const previousModeRef = useRef<ChatBotMode>(mode);

  const rememberOpenerElement = useCallback(() => {
    if (typeof document === 'undefined') {
      openerElementRef.current = getToggleButton(toggleRootRef.current);
      return;
    }

    const activeElement = document.activeElement;

    openerElementRef.current = isHTMLElement(activeElement)
      ? activeElement
      : getToggleButton(toggleRootRef.current);
  }, []);

  const focusComposerOrPanel = useCallback(() => {
    if (typeof window === 'undefined' || hasExternalModalFocus(rootRef.current)) {
      return;
    }

    window.requestAnimationFrame(() => {
      const composer = inputRef.current;

      if (composer && !composer.disabled && !isDisabledElement(composer)) {
        composer.focus({ preventScroll: true });
        return;
      }

      panelRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const restoreFocusToOpener = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      const opener = openerElementRef.current;

      if (opener?.isConnected && !isDisabledElement(opener)) {
        opener.focus({ preventScroll: true });
        return;
      }

      getToggleButton(toggleRootRef.current)?.focus({ preventScroll: true });
    });
  }, []);

  const shouldIgnoreToggleShortcut = useCallback((event: KeyboardEvent | ReactKeyboardEvent) => {
    const nativeEvent = 'nativeEvent' in event ? event.nativeEvent : event;
    const eventTarget = isHTMLElement(event.target) ? event.target : nativeEvent.target;

    return Boolean(
      nativeEvent.isComposing ||
      isEditableTarget(eventTarget) ||
      hasExternalModalFocus(rootRef.current),
    );
  }, []);

  const handlePanelEscapeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const nativeEvent = event.nativeEvent as KeyboardEvent & { isComposing?: boolean };

    if (
      event.key !== 'Escape' ||
      nativeEvent.isComposing ||
      mode !== 'open' ||
      !panelRef.current?.contains(event.target as Node)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onEscapeClose();
  }, [mode, onEscapeClose]);

  useEffect(() => {
    if (mode === 'open') {
      focusComposerOrPanel();
    }
  }, [focusComposerOrPanel, mode]);

  useEffect(() => {
    const previousMode = previousModeRef.current;

    if (previousMode === 'open' && mode !== 'open') {
      restoreFocusToOpener();
    }

    previousModeRef.current = mode;
  }, [mode, restoreFocusToOpener]);

  return useMemo(() => ({
    inputRef,
    rootRef,
    panelRef,
    toggleRootRef,
    rememberOpenerElement,
    focusComposerOrPanel,
    restoreFocusToOpener,
    handlePanelEscapeKeyDown,
    shouldIgnoreToggleShortcut,
  }), [
    focusComposerOrPanel,
    handlePanelEscapeKeyDown,
    rememberOpenerElement,
    restoreFocusToOpener,
    shouldIgnoreToggleShortcut,
  ]);
};

export default useChatFocus;
