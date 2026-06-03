/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAT_API_URL?: string;
  readonly VITE_CHAT_API_KEY?: string;
  readonly VITE_CHAT_PORTFOLIO_AGENT_ID?: string;
  readonly VITE_CHAT_MATRIX_RPG_AGENT_ID?: string;

  /** @deprecated Use VITE_CHAT_API_URL. Kept for local backward compatibility. */
  readonly VITE_COMPLETIONS_API_URL?: string;
  /** @deprecated Use VITE_CHAT_PORTFOLIO_AGENT_ID. Kept for local backward compatibility. */
  readonly VITE_CHATBOT_AGENT_MODEL?: string;
  /** @deprecated Use VITE_CHAT_MATRIX_RPG_AGENT_ID. Kept for local backward compatibility. */
  readonly VITE_MATRIX_RPG_AGENT_MODEL?: string;
}
