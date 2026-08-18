import { describe, expect, it } from "vitest";
import {
  capHistory,
  exportForRxiver,
  MAX_HISTORY,
  safeSourceUrl,
  type HistoryEntry,
} from "../src/lib/history.js";

describe("history", () => {
  it("removes query strings and fragments from source URLs", () => {
    expect(safeSourceUrl("https://example.org/paper?id=secret#results"))
      .toBe("https://example.org/paper");
    expect(safeSourceUrl("chrome-extension://abc/reader.html")).toBe("");
  });

  it("keeps only the newest bounded set", () => {
    const entries = Array.from(
      { length: MAX_HISTORY + 5 },
      (_, i) => ({ id: String(i) } as HistoryEntry),
    );
    expect(capHistory(entries)).toHaveLength(MAX_HISTORY);
    expect(capHistory(entries).at(-1)?.id).toBe(String(MAX_HISTORY - 1));
  });

  it("exports explanation history as rxiver excerpts", () => {
    const entry = {
      selection: "A dense claim",
      explanation: "A clear explanation",
      sourceTitle: "The paper",
      sourceUrl: "https://example.org/paper",
    } as HistoryEntry;
    expect(exportForRxiver([entry], "2026-08-17T00:00:00.000Z")).toEqual({
      version: 1,
      source: "rxiver-gloss",
      exportedAt: "2026-08-17T00:00:00.000Z",
      excerpts: [{
        text: "A dense claim",
        note: "A clear explanation",
        source: "https://example.org/paper",
      }],
    });
  });
});
