// Pure parsing of Anthropic Messages API responses.

interface ContentBlock {
  type: string;
  text?: string;
}

interface MessagesResponse {
  content?: ContentBlock[];
  stop_reason?: string;
}

interface ApiErrorResponse {
  error?: { type?: string; message?: string };
}

/**
 * Extract the plain-text explanation from a successful Messages API response.
 * Joins all text blocks; ignores non-text blocks (e.g. thinking).
 */
export function parseExplanation(body: unknown): string {
  const resp = body as MessagesResponse;
  if (!resp || !Array.isArray(resp.content)) {
    throw new Error("Unexpected response shape from the model.");
  }
  const text = resp.content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => (b.text as string).trim())
    .filter((t) => t.length > 0)
    .join("\n\n")
    .trim();

  if (!text) {
    if (resp.stop_reason === "refusal") {
      throw new Error("The model declined to explain this selection.");
    }
    throw new Error("The model returned an empty explanation.");
  }
  return text;
}

/** Extract a human-readable error message from an API error body. */
export function parseError(body: unknown, status?: number): string {
  const resp = body as ApiErrorResponse;
  const msg = resp?.error?.message;
  if (typeof msg === "string" && msg.length > 0) {
    return status ? `Anthropic API error ${status}: ${msg}` : `Anthropic API error: ${msg}`;
  }
  return status ? `Anthropic API request failed (HTTP ${status}).` : "Anthropic API request failed.";
}
