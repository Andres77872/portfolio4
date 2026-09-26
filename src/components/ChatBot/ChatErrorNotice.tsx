import { AlertCircle, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getContactLink } from '@/data/profile';
import { scrollToSection } from '@/lib/scroll';
import { cn } from '@/lib/utils';

import { ERROR_COPY } from './chatErrors';
import { navigateFromChat, useChatNav } from './chatNavContext';
import type { ChatErrorKind } from './conversation';
import { focusRing, panelTextButton } from './styles';

interface ChatErrorNoticeProps {
  kind: ChatErrorKind;
  canRetry: boolean;
  onRetry(): void;
  onNewChat(): void;
}

const buttonClasses = cn(panelTextButton, focusRing);

/** Plain-language failure notice with fallbacks. The raw error never reaches the DOM. */
export default function ChatErrorNotice({ kind, canRetry, onRetry, onNewChat }: ChatErrorNoticeProps) {
  const nav = useChatNav();
  const copy = ERROR_COPY[kind];
  const email = getContactLink('Email')?.url;

  const actions = copy.actions.filter(
    (action) => (action !== 'retry' || canRetry) && (action !== 'email' || Boolean(email)),
  );

  return (
    <div className="mt-2 flex gap-2 rounded-lg border border-destructive/50 bg-card p-3 contrast-more:border-destructive">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{copy.title}</p>
        <p className="text-xs text-muted-foreground">{copy.detail}</p>
        {actions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {actions.map((action) => {
              switch (action) {
                case 'retry':
                  return (
                    <Button key={action} type="button" variant="outline" size="sm" onClick={onRetry} className={buttonClasses}>
                      <RotateCcw />
                      Retry
                    </Button>
                  );
                case 'email':
                  return (
                    <Button key={action} asChild variant="ghost" size="sm" className={buttonClasses}>
                      <a href={email}>Email Andres</a>
                    </Button>
                  );
                case 'browse':
                  return (
                    <Button
                      key={action}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateFromChat(nav, 'projects', () => scrollToSection('projects'), 'Moved to Work.')}
                      className={buttonClasses}
                    >
                      Browse projects
                    </Button>
                  );
                default:
                  return (
                    <Button key={action} type="button" variant="outline" size="sm" onClick={onNewChat} className={buttonClasses}>
                      New chat
                    </Button>
                  );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}
