// Pure prompt construction. Style + context -> Anthropic Messages request.

import type { AnthropicRequest, Style } from "./types.js";
import type { ExtractedContext } from "./context.js";

const STYLE_GUIDANCE: Record<Style, string> = {
  plain:
    "Explain in plain, clear language a knowledgeable adult would understand. Avoid jargon unless you define it.",
  eli5: "Explain as if to a curious beginner. Use simple words and a short analogy where it helps.",
  technical:
    "Explain precisely for a domain expert. Use correct technical terminology and be exact.",
};

/** Build the system prompt for a given style and target length. */
export function buildSystemPrompt(style: Style, maxLength: number): string {
  const words = Math.max(20, Math.min(400, Math.round(maxLength)));
  return [
    "You are gloss, an assistant that explains dense text for researchers reading papers.",
    "You are given a passage of surrounding context and, within it, a specific highlighted part.",
    "Explain what the highlighted part means, using the surrounding context to interpret it correctly.",
    "Explain only the highlighted part. Do not summarize the whole context.",
    STYLE_GUIDANCE[style],
    `Keep the explanation to roughly ${words} words or fewer.`,
    "Respond with the explanation only. Do not restate the highlighted text or add a preamble.",
  ].join(" ");
}

/** Build the user message content from the extracted context. */
export function buildUserContent(ctx: ExtractedContext): string {
  const context = ctx.context && ctx.context.trim().length > 0 ? ctx.context.trim() : ctx.selection;
  return [
    "Surrounding context:",
    '"""',
    context,
    '"""',
    "",
    "Highlighted part to explain:",
    '"""',
    ctx.selection,
    '"""',
  ].join("\n");
}

/** Rough token budget from a target word count, with a floor. */
export function maxTokensFor(maxLength: number): number {
  const words = Math.max(20, Math.min(400, Math.round(maxLength)));
  // ~1.6 tokens/word plus headroom.
  return Math.max(128, Math.round(words * 1.6) + 64);
}

/** Assemble the full Anthropic Messages request body. */
export function buildRequestBody(
  model: string,
  ctx: ExtractedContext,
  style: Style,
  maxLength: number,
): AnthropicRequest {
  return {
    model,
    max_tokens: maxTokensFor(maxLength),
    system: buildSystemPrompt(style, maxLength),
    messages: [{ role: "user", content: buildUserContent(ctx) }],
  };
}
