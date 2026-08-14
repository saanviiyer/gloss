import { describe, it, expect } from "vitest";
import {
  buildRequestBody,
  buildSystemPrompt,
  buildUserContent,
  maxTokensFor,
} from "../src/lib/prompt.js";
import type { ExtractedContext } from "../src/lib/context.js";

const ctx: ExtractedContext = {
  selection: "attention mechanism",
  before: "Neural networks learn features.",
  after: "This helps long-range dependencies.",
  context: "Neural networks learn features. The attention mechanism weighs tokens. This helps long-range dependencies.",
};

describe("buildSystemPrompt", () => {
  it("reflects the chosen style", () => {
    expect(buildSystemPrompt("eli5", 90)).toMatch(/beginner/i);
    expect(buildSystemPrompt("technical", 90)).toMatch(/expert/i);
    expect(buildSystemPrompt("plain", 90)).toMatch(/plain/i);
  });

  it("encodes the target length", () => {
    expect(buildSystemPrompt("plain", 60)).toContain("60 words");
  });

  it("clamps absurd lengths", () => {
    expect(buildSystemPrompt("plain", 99999)).toContain("400 words");
    expect(buildSystemPrompt("plain", 1)).toContain("20 words");
  });
});

describe("buildUserContent", () => {
  it("includes both context and the highlighted part", () => {
    const content = buildUserContent(ctx);
    expect(content).toContain("Surrounding context:");
    expect(content).toContain("Highlighted part to explain:");
    expect(content).toContain("attention mechanism");
    expect(content).toContain("weighs tokens");
  });

  it("falls back to selection when context is empty", () => {
    const content = buildUserContent({ ...ctx, context: "" });
    expect(content).toContain("attention mechanism");
  });
});

describe("maxTokensFor", () => {
  it("has a floor of 128", () => {
    expect(maxTokensFor(1)).toBeGreaterThanOrEqual(128);
  });
  it("scales with length", () => {
    expect(maxTokensFor(300)).toBeGreaterThan(maxTokensFor(50));
  });
});

describe("buildRequestBody", () => {
  it("produces a valid Messages request shape", () => {
    const body = buildRequestBody("claude-haiku-4-5", ctx, "plain", 90);
    expect(body.model).toBe("claude-haiku-4-5");
    expect(body.max_tokens).toBeGreaterThan(0);
    expect(typeof body.system).toBe("string");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toContain("attention mechanism");
  });
});
