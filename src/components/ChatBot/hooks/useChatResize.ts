import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

import type { ChatBotDimensions, UseChatResizeResult } from '../types';

const DEFAULT_DIMENSIONS: ChatBotDimensions = { width: 400, height: 550 };

const MIN_WIDTH = 320;
const MIN_HEIGHT = 400;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 700;
const VIEWPORT_X_MARGIN = 40;
const VIEWPORT_Y_MARGIN = 120;
const KEY_STEP = 16;
const KEY_STEP_LARGE = 48;

const canUseViewport = (): boolean => typeof window !== 'undefined';

const isDesktopResizeAvailable = (): boolean => {
  if (!canUseViewport()) {
    return false;
  }

  return !window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(min-width: 768px)').matches;
};

export const clampChatbotDimensions = (
  width: number,
  height: number,
): ChatBotDimensions => {
  if (!canUseViewport()) {
    return {
      width: Math.max(MIN_WIDTH, Math.min(width, MAX_WIDTH)),
      height: Math.max(MIN_HEIGHT, Math.min(height, MAX_HEIGHT)),
    };
  }

  const viewportMaxWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - VIEWPORT_X_MARGIN));
  const viewportMaxHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, window.innerHeight - VIEWPORT_Y_MARGIN));

  return {
    width: Math.max(MIN_WIDTH, Math.min(width, viewportMaxWidth)),
    height: Math.max(MIN_HEIGHT, Math.min(height, viewportMaxHeight)),
  };
};

export interface UseChatResizeOptions {
  defaultDimensions?: ChatBotDimensions;
}

export const useChatResize = (
  options: UseChatResizeOptions = {},
): UseChatResizeResult => {
  const { defaultDimensions = DEFAULT_DIMENSIONS } = options;
  const [dimensions, setDimensions] = useState<ChatBotDimensions>(() =>
    clampChatbotDimensions(defaultDimensions.width, defaultDimensions.height),
  );
  const [isResizing, setIsResizing] = useState(false);
  const cleanupResizeRef = useRef<(() => void) | null>(null);

  const updateDimensions = useCallback((width: number, height: number) => {
    setDimensions(clampChatbotDimensions(width, height));
  }, []);

  const startPointerResize = useCallback((event: ReactPointerEvent | ReactMouseEvent) => {
    if (!isDesktopResizeAvailable()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    cleanupResizeRef.current?.();

    const startX = event.clientX;
    const startY = event.clientY;
    const startDimensions = dimensions;
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;

    setIsResizing(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nw-resize';

    const cleanup = () => {
      setIsResizing(false);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', cleanup);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', cleanup);
      document.removeEventListener('pointercancel', cleanup);

      if (cleanupResizeRef.current === cleanup) {
        cleanupResizeRef.current = null;
      }
    };

    const resizeFromClientPosition = (clientX: number, clientY: number) => {
      const deltaX = startX - clientX;
      const deltaY = startY - clientY;

      updateDimensions(startDimensions.width + deltaX, startDimensions.height + deltaY);
    };

    function onMouseMove(moveEvent: MouseEvent) {
      resizeFromClientPosition(moveEvent.clientX, moveEvent.clientY);
    }

    function onPointerMove(moveEvent: PointerEvent) {
      resizeFromClientPosition(moveEvent.clientX, moveEvent.clientY);
    }

    if ('pointerId' in event.nativeEvent) {
      cleanupResizeRef.current = cleanup;
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', cleanup);
      document.addEventListener('pointercancel', cleanup);
      return;
    }

    cleanupResizeRef.current = cleanup;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', cleanup);
  }, [dimensions, updateDimensions]);

  const handleResizeKeyDown = useCallback((event: ReactKeyboardEvent) => {
    if (!isDesktopResizeAvailable()) {
      return;
    }

    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    let widthDelta = 0;
    let heightDelta = 0;

    switch (event.key) {
      case 'ArrowLeft':
        widthDelta = step;
        break;
      case 'ArrowRight':
        widthDelta = -step;
        break;
      case 'ArrowUp':
        heightDelta = step;
        break;
      case 'ArrowDown':
        heightDelta = -step;
        break;
      default:
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    setDimensions((currentDimensions) =>
      clampChatbotDimensions(
        currentDimensions.width + widthDelta,
        currentDimensions.height + heightDelta,
      ),
    );
  }, []);

  useEffect(() => {
    if (!canUseViewport()) {
      return;
    }

    const handleViewportResize = () => {
      setDimensions((currentDimensions) =>
        clampChatbotDimensions(currentDimensions.width, currentDimensions.height),
      );
    };

    window.addEventListener('resize', handleViewportResize);

    return () => {
      window.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  useEffect(() => {
    return () => {
      cleanupResizeRef.current?.();
    };
  }, []);

  return useMemo(() => ({
    dimensions,
    isResizing,
    startPointerResize,
    handleResizeKeyDown,
  }), [dimensions, handleResizeKeyDown, isResizing, startPointerResize]);
};

export default useChatResize;
