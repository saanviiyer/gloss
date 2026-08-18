import type { ExtractedContext } from "./context.js";

const KEY = "gloss:history:v1";
export const MAX_HISTORY = 100;

export interface HistoryEntry {
  id: string;
  createdAt: string;
  selection: string;
  context: string;
  explanation: string;
  sourceTitle: string;
  sourceUrl: string;
  mock: boolean;
}

export interface RxiverGlossExport {
  version: 1;
  source: "rxiver-gloss";
  exportedAt: string;
  excerpts: { text: string; note: string; source: string }[];
}

export function exportForRxiver(
  entries: HistoryEntry[],
  exportedAt = new Date().toISOString(),
): RxiverGlossExport {
  return {
    version: 1,
    source: "rxiver-gloss",
    exportedAt,
    excerpts: entries.map((entry) => ({
      text: entry.selection,
      note: entry.explanation,
      source: entry.sourceUrl || entry.sourceTitle,
    })),
  };
}

export function capHistory(entries: HistoryEntry[]): HistoryEntry[] {
  return entries.slice(0, MAX_HISTORY);
}

export function safeSourceUrl(raw = ""): string {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:"
      ? `${url.origin}${url.pathname}`
      : "";
  } catch {
    return "";
  }
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const stored = await chrome.storage.local.get(KEY);
  const entries = stored?.[KEY];
  return Array.isArray(entries) ? capHistory(entries as HistoryEntry[]) : [];
}

export async function addHistory(input: {
  ctx: ExtractedContext;
  explanation: string;
  sourceTitle?: string;
  sourceUrl?: string;
  mock: boolean;
}): Promise<HistoryEntry> {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    selection: input.ctx.selection,
    context: input.ctx.context,
    explanation: input.explanation,
    sourceTitle: input.sourceTitle?.trim() || "Untitled page",
    sourceUrl: safeSourceUrl(input.sourceUrl),
    mock: input.mock,
  };
  const history = await getHistory();
  await chrome.storage.local.set({ [KEY]: capHistory([entry, ...history]) });
  return entry;
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(KEY);
}
