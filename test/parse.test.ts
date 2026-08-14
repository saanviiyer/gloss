import { describe, it, expect } from "vitest";
import { parseExplanation, parseError } from "../src/lib/parse.js";

describe("parseExplanation", () => {
  it("joins text blocks", () => {
    const body = {
      content: [
        { type: "text", text: "First part." },
        { type: "text", text: "Second part." },
      ],
      stop_reason: "end_turn",
    };
    expect(parseExplanation(body)).toBe("First part.\n\nSecond part.");
  });

  it("ignores non-text blocks", () => {
    const body = {
      content: [
        { type: "thinking", thinking: "…" },
        { type: "text", text: "The answer." },
      ],
    };
    expect(parseExplanation(body)).toBe("The answer.");
  });

  it("throws on an empty response", () => {
    expect(() => parseExplanation({ content: [] })).toThrow(/empty/i);
  });

  it("throws a clear message on refusal", () => {
    expect(() => parseExplanation({ content: [], stop_reason: "refusal" })).toThrow(/declined/i);
  });

  it("throws on a malformed body", () => {
    expect(() => parseExplanation({ foo: "bar" })).toThrow(/Unexpected/i);
  });
});

describe("parseError", () => {
  it("extracts the API error message and status", () => {
    const body = { error: { type: "authentication_error", message: "invalid x-api-key" } };
    expect(parseError(body, 401)).toContain("invalid x-api-key");
    expect(parseError(body, 401)).toContain("401");
  });

  it("falls back when no message is present", () => {
    expect(parseError(null, 500)).toContain("500");
  });
});
