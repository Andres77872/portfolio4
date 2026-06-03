import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import { ChatBotInputProps } from './types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ChatBotInput: React.FC<ChatBotInputProps> = ({
  input,
  isStreaming,
  onInputChange,
  onSubmitMessage,
  inputRef
}) => {
  const isComposingRef = React.useRef(false);
  const canSubmit = !isStreaming && input.trim().length > 0;

  React.useLayoutEffect(() => {
    const textarea = inputRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 112 ? 'auto' : 'hidden';
  }, [input, inputRef]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!canSubmit) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    onSubmitMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const nativeEvent = e.nativeEvent as KeyboardEvent & { isComposing?: boolean };

    if (e.key !== 'Enter' || e.shiftKey || isComposingRef.current || nativeEvent.isComposing) {
      return;
    }

    e.preventDefault();

    if (!canSubmit) {
      return;
    }

    e.currentTarget.form?.requestSubmit();
  };

  return (
    <form
      className={cn(
        'flex items-end gap-2 border-t border-border bg-muted/40 px-3.5 py-2.5',
        'max-md:px-3 max-md:py-2 max-xs:gap-1.5'
      )}
      onSubmit={handleFormSubmit}
    >
      <textarea
        ref={inputRef}
        className={cn(
          'max-h-28 min-h-9 flex-1 resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm leading-5 text-foreground outline-none transition-[border-color,box-shadow]',
          'placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
          'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
          'max-md:min-h-8 max-md:py-1.5 max-xs:min-h-7 max-xs:px-2 max-xs:py-1',
        )}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={() => {
          isComposingRef.current = false;
        }}
        placeholder="Ask about Andres's AI projects..."
        disabled={isStreaming}
        aria-label="Type your message"
        autoComplete="off"
        rows={1}
      />
      <Button
        className={cn(
          'size-9 shrink-0 rounded-lg transition-[background-color,color,box-shadow,transform] duration-200',
          'hover:enabled:shadow-sm',
          'active:enabled:scale-[0.98]',
          'max-md:size-8 max-xs:size-7',
        )}
        type="submit"
        size="icon"
        disabled={!canSubmit}
        aria-label={isStreaming ? "Sending message..." : "Send message"}
      >
        {isStreaming ? (
          <Loader2 className="h-4 w-4 animate-spin stroke-[2]" />
        ) : (
          <Send className="h-4 w-4 stroke-[2]" />
        )}
      </Button>
    </form>
  );
};

export default ChatBotInput;
