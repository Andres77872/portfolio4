export type ChatConsumer = 'portfolio-assistant' | 'matrix-rpg';

export interface ChatConsumerConfig {
  model: string;
}

export interface ChatServiceConfig {
  endpoint: string;
  apiKey?: string;
  consumers: Record<ChatConsumer, ChatConsumerConfig>;
}

export const CHAT_CONSUMERS = {
  PORTFOLIO_ASSISTANT: 'portfolio-assistant',
  MATRIX_RPG: 'matrix-rpg',
} as const satisfies Record<string, ChatConsumer>;

const DEFAULT_CHAT_API_URL = 'https://magic.arz.ai/chat/openai/v1/completion';

type ChatEnv = Pick<
  ImportMetaEnv,
  | 'VITE_CHAT_API_URL'
  | 'VITE_CHAT_API_KEY'
  | 'VITE_CHAT_PORTFOLIO_AGENT_ID'
  | 'VITE_CHAT_MATRIX_RPG_AGENT_ID'
  | 'VITE_COMPLETIONS_API_URL'
  | 'VITE_CHATBOT_AGENT_MODEL'
  | 'VITE_MATRIX_RPG_AGENT_MODEL'
>;

const readEnvValue = (...values: Array<string | undefined>): string | undefined => {
  const value = values.find((candidate) => candidate?.trim());
  return value?.trim();
};

export function resolveChatServiceConfig(env: ChatEnv): ChatServiceConfig {
  const endpoint = readEnvValue(env.VITE_CHAT_API_URL, env.VITE_COMPLETIONS_API_URL) ?? DEFAULT_CHAT_API_URL;
  const apiKey = readEnvValue(env.VITE_CHAT_API_KEY);
  const portfolioModel = readEnvValue(env.VITE_CHAT_PORTFOLIO_AGENT_ID, env.VITE_CHATBOT_AGENT_MODEL);
  const matrixRpgModel = readEnvValue(env.VITE_CHAT_MATRIX_RPG_AGENT_ID, env.VITE_MATRIX_RPG_AGENT_MODEL, portfolioModel);

  return {
    endpoint,
    apiKey,
    consumers: {
      [CHAT_CONSUMERS.PORTFOLIO_ASSISTANT]: requireModel(
        portfolioModel,
        'VITE_CHAT_PORTFOLIO_AGENT_ID',
      ),
      [CHAT_CONSUMERS.MATRIX_RPG]: requireModel(
        matrixRpgModel,
        'VITE_CHAT_MATRIX_RPG_AGENT_ID',
      ),
    },
  };
}

export function getChatServiceConfig(): ChatServiceConfig {
  return resolveChatServiceConfig(import.meta.env);
}

export function getChatConsumerConfig(consumer: ChatConsumer): ChatConsumerConfig {
  return getChatServiceConfig().consumers[consumer];
}

function requireModel(model: string | undefined, envName: string): ChatConsumerConfig {
  if (!model) {
    throw new Error(`Missing ${envName}. Configure a public chat agent/model identifier.`);
  }

  return { model };
}
