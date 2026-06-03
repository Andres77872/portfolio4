import React, { useCallback, useMemo } from 'react';

import ChatBotToggle from './ChatBotToggle';
import ChatBotWindow from './ChatBotWindow';
import ChatBotHeader from './ChatBotHeader';
import ChatBotWelcome from './ChatBotWelcome';
import ChatBotMessages from './ChatBotMessages';
import ChatBotInput from './ChatBotInput';
import ChatBotResizeHandle from './ChatBotResizeHandle';
import { useChatFocus } from './hooks/useChatFocus';
import { useChatResize } from './hooks/useChatResize';
import { useChatStream } from './hooks/useChatStream';
import { useChatUiState } from './hooks/useChatUiState';
import { usePromptCue } from './hooks/usePromptCue';
import { useSystemContext } from './hooks/useSystemContext';

import type { ChatBotProps, SuggestedQuery } from './types';
import { cn } from '@/lib/utils';

const CHATBOT_PANEL_TITLE_ID = 'portfolio-chatbot-title';

const ChatBot: React.FC<ChatBotProps> = ({ className = '' }) => {
  const {
    mode,
    isOpen,
    isMinimized,
    showResetConfirmation,
    closeChat,
    toggleFromTrigger,
    showResetConfirmationPrompt,
    hideResetConfirmationPrompt,
  } = useChatUiState();

  const systemContext = useSystemContext();
  const {
    messages,
    input,
    setInput,
    isStreaming,
    sendMessage,
    retryLastFailed,
    resetConversation,
    cancelActiveStream,
  } = useChatStream({ systemContext });
  const { dimensions, isResizing, startPointerResize, handleResizeKeyDown } = useChatResize();
  const { showPromptCue, dismissPromptCue } = usePromptCue(mode);

  const handleEscapeClose = useCallback(() => {
    cancelActiveStream();
    closeChat();
  }, [cancelActiveStream, closeChat]);

  const {
    inputRef,
    rootRef,
    panelRef,
    toggleRootRef,
    rememberOpenerElement,
    focusComposerOrPanel,
    handlePanelEscapeKeyDown,
  } = useChatFocus({
    mode,
    onEscapeClose: handleEscapeClose,
  });

  const suggestedQueries: SuggestedQuery[] = useMemo(() => [
    { text: 'What AI technologies does Andres specialize in?', icon: '🤖', category: 'skills' },
    { text: 'Tell me about the FindIT project', icon: '🔍', category: 'projects' },
    { text: 'Explain Novus Talk and magic-agents', icon: '🕸️', category: 'projects' },
    { text: 'How can I contact Andres?', icon: '📧', category: 'contact' },
    { text: 'What makes this portfolio unique?', icon: '✨', category: 'general' },
    { text: 'Show me projects using LLMs', icon: '🧠', category: 'projects' },
  ], []);

  const handleToggleChatbot = useCallback(() => {
    if (!isOpen) {
      rememberOpenerElement();
      dismissPromptCue();
    }

    toggleFromTrigger();
  }, [dismissPromptCue, isOpen, rememberOpenerElement, toggleFromTrigger]);

  const handleCloseChatbot = useCallback(() => {
    cancelActiveStream();
    closeChat();
  }, [cancelActiveStream, closeChat]);

  const handleResetConfirm = useCallback(() => {
    resetConversation();
    hideResetConfirmationPrompt();
    focusComposerOrPanel();
  }, [focusComposerOrPanel, hideResetConfirmationPrompt, resetConversation]);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);

    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: 'smooth' });
    toggleFromTrigger();
  }, [toggleFromTrigger]);

  const handleSuggestedQuery = useCallback((query: string) => {
    setInput(query);
    void sendMessage(query);
  }, [sendMessage, setInput]);

  const handleSubmitMessage = useCallback((content: string) => {
    void sendMessage(content);
  }, [sendMessage]);

  const handleRetryLastFailed = useCallback(() => {
    void retryLastFailed();
  }, [retryLastFailed]);

  return (
    <div
      ref={rootRef}
      className={cn('fixed bottom-5 right-5 z-50 flex flex-col items-end max-md:bottom-3 max-md:right-3', className)}
    >
      <ChatBotToggle
        isOpen={isOpen}
        isMinimized={isMinimized}
        showPromptCue={showPromptCue}
        onClick={handleToggleChatbot}
        rootRef={toggleRootRef}
      />

      <ChatBotWindow
        isOpen={isOpen}
        isMinimized={isMinimized}
        dimensions={dimensions}
        isResizing={isResizing}
        titleId={CHATBOT_PANEL_TITLE_ID}
        panelRef={panelRef}
        onEscapeKeyDown={handlePanelEscapeKeyDown}
      >
        <ChatBotHeader
          titleId={CHATBOT_PANEL_TITLE_ID}
          onClose={handleCloseChatbot}
          onMinimize={handleToggleChatbot}
          onResetClick={showResetConfirmationPrompt}
          isMinimized={isMinimized}
          showResetConfirmation={showResetConfirmation}
          onResetConfirm={handleResetConfirm}
          onResetCancel={hideResetConfirmationPrompt}
        />

        {messages.length === 0 ? (
          <>
            <p className="mx-4 mt-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              AI disclosure: messages you send here are processed by an external AI service.
              Avoid sharing secrets or sensitive personal information.
            </p>
            <ChatBotWelcome
              suggestedQueries={suggestedQueries}
              onSuggestedQuery={handleSuggestedQuery}
              onScrollToSection={scrollToSection}
            />
          </>
        ) : (
          <ChatBotMessages
            messages={messages}
            isStreaming={isStreaming}
            onRetryLastFailed={handleRetryLastFailed}
          />
        )}

        <ChatBotInput
          input={input}
          isStreaming={isStreaming}
          onInputChange={setInput}
          onSubmitMessage={handleSubmitMessage}
          inputRef={inputRef}
        />

        <p className="rounded-b-2xl border-t border-border bg-muted/40 px-4 py-2 text-[0.7rem] leading-snug text-muted-foreground/80">
          External AI service processes chat messages. Do not send secrets.
        </p>

        <ChatBotResizeHandle
          onResizeStart={startPointerResize}
          onResizeKeyDown={handleResizeKeyDown}
          dimensions={dimensions}
        />
      </ChatBotWindow>
    </div>
  );
};

export default React.memo(ChatBot);
