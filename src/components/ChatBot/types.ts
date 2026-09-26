// Compatibility shim: the service types moved to `@/services/chatTypes` and the conversation
// types live in `./conversation`. The Matrix RPG (MatrixRPG.tsx, discovery.ts) still imports
// `ChatRequestMessage` from here; drop this file once the games import from services.
export type { ChatMessageRole, ChatRequestMessage, ChatRequest, ChatServiceOptions } from '@/services/chatTypes';
export type { ChatItem, UserTurn, AssistantTurn, AssistantStatus, ChatErrorKind } from './conversation';
