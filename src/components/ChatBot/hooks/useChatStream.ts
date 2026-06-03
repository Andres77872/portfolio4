import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SetStateAction } from 'react';

import { CHAT_CONSUMERS } from '@/config/chatConfig';
import { streamChatCompletion } from '../../../services/chatService';
import type { Message, UseChatStreamResult } from '../types';

interface ActiveStream {
  id: string;
  controller: AbortController;
}

export interface UseChatStreamOptions {
  systemContext: Message;
}

const createMessageId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

export const useChatStream = ({ systemContext }: UseChatStreamOptions): UseChatStreamResult => {
  const [input, setInput] = useState('');
  const [messages, setMessagesState] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const activeStreamRef = useRef<ActiveStream | null>(null);
  const messagesRef = useRef<Message[]>([]);

  const setMessages = useCallback((updater: SetStateAction<Message[]>) => {
    setMessagesState((previousMessages) => {
      const nextMessages = typeof updater === 'function'
        ? (updater as (previousMessages: Message[]) => Message[])(previousMessages)
        : updater;

      messagesRef.current = nextMessages;
      return nextMessages;
    });
  }, []);

  const cancelActiveStream = useCallback(() => {
    const activeStream = activeStreamRef.current;

    if (activeStream) {
      activeStream.controller.abort();
      activeStreamRef.current = null;
    }

    setIsStreaming(false);
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      activeStreamRef.current?.controller.abort();
      activeStreamRef.current = null;
    };
  }, []);

  const sendMessageContent = useCallback(async (content: string, retryUserMessage?: Message) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    cancelActiveStream();

    const streamId = createMessageId('stream');
    const assistantMessageId = createMessageId('assistant');
    const controller = new AbortController();
    activeStreamRef.current = { id: streamId, controller };

    const currentMessages = messagesRef.current;
    const userMessage: Message = retryUserMessage || {
      id: createMessageId('user'),
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'complete',
    };

    const requestMessages = retryUserMessage
      ? currentMessages.filter((message) => message.retryForMessageId !== retryUserMessage.id && message.status !== 'error')
      : [...currentMessages, userMessage];

    setMessages((previousMessages) => retryUserMessage
      ? previousMessages.filter((message) => message.retryForMessageId !== retryUserMessage.id)
      : [...previousMessages, userMessage]
    );
    setInput('');
    setIsStreaming(true);

    let assistantMessage = '';
    const assistantTimestamp = new Date();

    try {
      const stream = await streamChatCompletion({
        messages: [systemContext, ...requestMessages],
      }, {
        consumer: CHAT_CONSUMERS.PORTFOLIO_ASSISTANT,
        signal: controller.signal,
      });

      if (controller.signal.aborted || activeStreamRef.current?.id !== streamId) {
        return;
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      setMessages((previousMessages) => [...previousMessages, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: assistantTimestamp,
        status: 'streaming',
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (controller.signal.aborted || activeStreamRef.current?.id !== streamId) {
          await reader.cancel().catch(() => undefined);
          return;
        }

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        setMessages((previousMessages) => {
          if (activeStreamRef.current?.id !== streamId) {
            return previousMessages;
          }

          const nextAssistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: assistantMessage,
            timestamp: assistantTimestamp,
            status: 'streaming',
          };
          const hasAssistantDraft = previousMessages.some((message) => message.id === assistantMessageId);

          if (!hasAssistantDraft) {
            return [...previousMessages, nextAssistantMessage];
          }

          return previousMessages.map((message) =>
            message.id === assistantMessageId
              ? nextAssistantMessage
              : message
          );
        });
      }

      setMessages((previousMessages) => {
        if (activeStreamRef.current?.id !== streamId) {
          return previousMessages;
        }

        return previousMessages.map((message) =>
          message.id === assistantMessageId
            ? { ...message, status: 'complete' }
            : message
        );
      });
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error) || activeStreamRef.current?.id !== streamId) {
        return;
      }

      console.error('Error:', error);
      setMessages((previousMessages) => {
        const errorMessage = error instanceof Error ? error.message : 'Chat service request failed.';
        const assistantErrorMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: assistantMessage,
          timestamp: assistantTimestamp,
          status: 'error',
          errorMessage: assistantMessage
            ? `Response interrupted: ${errorMessage}`
            : errorMessage,
          retryForMessageId: userMessage.id,
        };

        const hasAssistantDraft = previousMessages.some((message) => message.id === assistantMessageId);

        if (hasAssistantDraft) {
          return previousMessages.map((message) =>
            message.id === assistantMessageId ? assistantErrorMessage : message
          );
        }

        return [...previousMessages, assistantErrorMessage];
      });
    } finally {
      if (activeStreamRef.current?.id === streamId) {
        activeStreamRef.current = null;
        setIsStreaming(false);
      }
    }
  }, [cancelActiveStream, setMessages, systemContext]);

  const sendMessage = useCallback(async (content: string) => {
    await sendMessageContent(content);
  }, [sendMessageContent]);

  const retryLastFailed = useCallback(async () => {
    const currentMessages = messagesRef.current;
    const failedMessage = [...currentMessages].reverse().find(
      (message) => message.role === 'assistant' && message.status === 'error' && message.retryForMessageId
    );

    if (!failedMessage?.retryForMessageId) return;

    const userMessage = currentMessages.find((message) => message.id === failedMessage.retryForMessageId);

    if (!userMessage) return;

    await sendMessageContent(userMessage.content, userMessage);
  }, [sendMessageContent]);

  const resetConversation = useCallback(() => {
    cancelActiveStream();
    setMessages([]);
    setInput('');
  }, [cancelActiveStream, setMessages]);

  return useMemo(() => ({
    messages,
    input,
    setInput,
    isStreaming,
    sendMessage,
    retryLastFailed,
    resetConversation,
    cancelActiveStream,
  }), [
    cancelActiveStream,
    input,
    isStreaming,
    messages,
    resetConversation,
    retryLastFailed,
    sendMessage,
  ]);
};

export default useChatStream;
