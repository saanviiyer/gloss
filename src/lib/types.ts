// Shared types. Pure, safe to import from anywhere (tests included).

export type Style = "plain" | "eli5" | "technical";

export const STYLES: Style[] = ["plain", "eli5", "technical"];

export interface Settings {
  /** Anthropic API key. Empty string means run in mock mode. */
  apiKey: string;
  /** Model id, e.g. "claude-haiku-4-5". */
  model: string;
  /** Explanation style. */
  style: Style;
  /** Approximate target length of the explanation, in words. */
  maxLength: number;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  // A current fast model, well suited to short explanations. Configurable in options.
  model: "claude-haiku-4-5",
  style: "plain",
  maxLength: 90,
};

/** Anthropic Messages API request body shape (only the fields we send). */
export interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
}
