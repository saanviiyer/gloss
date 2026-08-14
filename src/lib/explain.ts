// Explainer: turns an extracted context into an explanation, either by calling
// the Anthropic Messages API directly or, when no key is set, by returning a
// clearly labeled mock so the whole flow is testable with zero setup.
//
// No chrome/DOM imports: the network call is done with an injectable fetch so
// this module is unit-testable.

import type { Style } from "./types.js";
import type { ExtractedContext } from "./context.js";
import { buildRequestBody } from "./prompt.js";
import { parseError, parseExplanation } from "./parse.js";

export const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";

export interface ExplainParams {
  ctx: ExtractedContext;
  apiKey: string;
  model: string;
  style: Style;
  maxLength: number;
  /** Injectable fetch, defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export interface ExplainResult {
  text: string;
  /** True when the placeholder (no API key) path produced the text. */
  mock: boolean;
}

/** A clearly-labeled placeholder used when no API key is configured. */
export function mockExplanation(ctx: ExtractedContext, style: Style): string {
  const snippet = ctx.selection.length > 140 ? ctx.selection.slice(0, 139) + "…" : ctx.selection;
  return (
    `[gloss mock mode - no API key set] This is a placeholder ${style} explanation. ` +
    `You highlighted: "${snippet}". ` +
    `Set your Anthropic API key in the gloss options page to get a real explanation.`
  );
}

/**
 * Produce an explanation for the given context. Falls back to mock mode when
 * no API key is provided.
 */
export async function explain(params: ExplainParams): Promise<ExplainResult> {
  const { ctx, apiKey, model, style, maxLength } = params;

  if (!apiKey || apiKey.trim().length === 0) {
    return { text: mockExplanation(ctx, style), mock: true };
  }

  const doFetch = params.fetchImpl ?? fetch;
  const body = buildRequestBody(model, ctx, style, maxLength);

  const res = await doFetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      // Required for calling the Messages API directly from a browser context.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(parseError(json, res.status));
  }

  return { text: parseExplanation(json), mock: false };
}
