import { describe, it, expect, vi } from "vitest";
import {
  explain,
  mockExplanation,
  ANTHROPIC_MESSAGES_URL,
} from "../src/lib/explain.js";
import type { ExtractedContext } from "../src/lib/context.js";

const ctx: ExtractedContext = {
  selection: "attention mechanism",
  before: "",
  after: "",
  context: "The attention mechanism weighs tokens.",
};

describe("mockExplanation", () => {
  it("is clearly labeled and echoes the selection", () => {
    const text = mockExplanation(ctx, "plain");
    expect(text).toMatch(/mock mode/i);
    expect(text).toContain("attention mechanism");
  });
});

describe("explain", () => {
  it("returns a mock result when no API key is set", async () => {
    const res = await explain({
      ctx,
      apiKey: "",
      model: "claude-haiku-4-5",
      style: "plain",
      maxLength: 90,
    });
    expect(res.mock).toBe(true);
    expect(res.text).toMatch(/mock mode/i);
  });

  it("calls the Messages API with the required headers and parses the result", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({ content: [{ type: "text", text: "It weighs token relevance." }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const res = await explain({
      ctx,
      apiKey: "sk-ant-test",
      model: "claude-haiku-4-5",
      style: "technical",
      maxLength: 90,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(res.mock).toBe(false);
    expect(res.text).toBe("It weighs token relevance.");

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(ANTHROPIC_MESSAGES_URL);
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
    const sent = JSON.parse(init.body as string);
    expect(sent.model).toBe("claude-haiku-4-5");
    expect(sent.messages[0].content).toContain("attention mechanism");
  });

  it("throws a parsed error on a non-ok response", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({ error: { type: "rate_limit_error", message: "slow down" } }),
        { status: 429 },
      );
    });

    await expect(
      explain({
        ctx,
        apiKey: "sk-ant-test",
        model: "claude-haiku-4-5",
        style: "plain",
        maxLength: 90,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/slow down/);
  });
});
