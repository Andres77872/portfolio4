// Export the main ChatBot component as default
export { default } from './ChatBot';

// Export individual components for potential standalone use
export { default as ChatBotToggle } from './ChatBotToggle';
export { default as ChatBotWindow } from './ChatBotWindow';
export { default as ChatBotHeader } from './ChatBotHeader';
export { default as ChatBotWelcome } from './ChatBotWelcome';
export { default as ChatBotMessages } from './ChatBotMessages';
export { default as ChatBotInput } from './ChatBotInput';
export { default as ChatBotResizeHandle } from './ChatBotResizeHandle';

// Export all types for external use
export * from './types'; 