// Message contract between content script / reader and the background worker.
// Pure type + constant definitions.

import type { ExtractedContext } from "./context.js";

export const MSG_EXPLAIN = "gloss:explain";
export const MSG_EXPLAIN_SELECTION = "gloss:explain-current-selection";

export interface ExplainRequestMessage {
  type: typeof MSG_EXPLAIN;
  ctx: ExtractedContext;
}

export interface ExplainSelectionMessage {
  type: typeof MSG_EXPLAIN_SELECTION;
}

export type GlossMessage = ExplainRequestMessage | ExplainSelectionMessage;

export interface ExplainResponse {
  ok: boolean;
  text?: string;
  mock?: boolean;
  error?: string;
}
