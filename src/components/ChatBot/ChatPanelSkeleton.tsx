import type { RefObject } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import ChatDisclosure from './ChatDisclosure';
import ChatPanelTitle from './ChatPanelTitle';
import { isPanelEscapeTarget, useChatEscape } from './hooks/useChatEscape';
import { focusRing, headerIconButton, panelHeader } from './styles';

interface ChatPanelSkeletonProps {
  open: boolean;
  frameRef: RefObject<HTMLElement>;
  onClose(): void;
}

/** Suspense fallback inside the frame while the panel chunk loads: same header, geometry and disclosure. */
export default function ChatPanelSkeleton({ open, frameRef, onClose }: ChatPanelSkeletonProps) {
  useChatEscape(frameRef, open, (event) => {
    if (!isPanelEscapeTarget(event.target, frameRef.current)) return;
    event.preventDefault();
    onClose();
  });

  return (
    <>
      <div className={panelHeader}>
        <ChatPanelTitle />
        <Button
          type="button"
          variant="ghost"
          aria-label="Close assistant"
          onClick={onClose}
          className={cn(headerIconButton, focusRing)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div
        aria-busy="true"
        className="flex min-h-0 flex-1 items-center justify-center px-4 text-sm text-muted-foreground group-data-[short]/panel:h-40 group-data-[short]/panel:flex-none"
      >
        Loading assistant…
      </div>
      <ChatDisclosure />
    </>
  );
}
