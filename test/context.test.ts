import { describe, it, expect } from "vitest";
import { extractContext } from "../src/lib/context.js";

const PARA =
  "Neural networks learn hierarchical features. Attention mechanisms weigh token relevance. This improves long-range dependencies.";

describe("extractContext", () => {
  it("returns the exact highlighted text", () => {
    const start = PARA.indexOf("Attention mechanisms weigh token relevance");
    const end = start + "Attention mechanisms weigh token relevance".length;
    const out = extractContext(PARA, start, end);
    expect(out.selection).toBe("Attention mechanisms weigh token relevance");
  });

  it("includes one sentence of context on each side by default", () => {
    const start = PARA.indexOf("Attention");
    const end = start + "Attention mechanisms weigh token relevance".length;
    const out = extractContext(PARA, start, end);
    expect(out.before).toContain("Neural networks");
    expect(out.after).toContain("long-range dependencies");
    expect(out.context).toContain("Attention mechanisms");
  });

  it("handles a selection inside a single sentence", () => {
    const start = PARA.indexOf("hierarchical features");
    const end = start + "hierarchical features".length;
    const out = extractContext(PARA, start, end);
    expect(out.selection).toBe("hierarchical features");
    expect(out.context).toContain("Neural networks learn hierarchical features");
  });

  it("clamps context to maxContextChars", () => {
    const long = "A. " + "word ".repeat(500) + "target. B.";
    const idx = long.indexOf("target");
    const out = extractContext(long, idx, idx + "target".length, { maxContextChars: 50 });
    expect(out.context.length).toBeLessThanOrEqual(50);
  });

  it("degrades gracefully with no sentence punctuation", () => {
    const text = "just some words without any punctuation here";
    const out = extractContext(text, 5, 9);
    expect(out.selection).toBe("some");
    expect(out.context.length).toBeGreaterThan(0);
  });
});
