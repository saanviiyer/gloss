// Pure selection / context extraction logic.
// Given a block of text and the offsets of a selection within it, return the
// highlighted text plus the surrounding sentence(s) that give the model context.
// No DOM or chrome APIs here so this stays unit-testable.

export interface ExtractedContext {
  /** The exact text the user highlighted. */
  selection: string;
  /** Sentence text immediately before the selection (may be empty). */
  before: string;
  /** Sentence text immediately after the selection (may be empty). */
  after: string;
  /** The selection plus its surrounding sentence context, as one string. */
  context: string;
}

export interface ExtractOptions {
  /** How many sentences of context to include on each side. Default 1. */
  sentencesEachSide?: number;
  /** Hard cap on the context length in characters. Default 1200. */
  maxContextChars?: number;
}

const SENTENCE_END = /[.!?]["')\]]?\s+/g;

/**
 * Split a piece of text into sentences, preserving their original spans so the
 * caller can locate which sentences a selection falls into.
 */
function splitSentences(text: string): { text: string; start: number; end: number }[] {
  const spans: { text: string; start: number; end: number }[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  SENTENCE_END.lastIndex = 0;
  while ((match = SENTENCE_END.exec(text)) !== null) {
    const end = match.index + match[0].length;
    spans.push({ text: text.slice(last, end).trim(), start: last, end });
    last = end;
  }
  if (last < text.length) {
    spans.push({ text: text.slice(last).trim(), start: last, end: text.length });
  }
  return spans.filter((s) => s.text.length > 0);
}

function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

/**
 * Extract the highlighted text and the sentence(s) around it.
 *
 * @param fullText  The surrounding block of text (e.g. a paragraph).
 * @param start     Character offset where the selection begins in fullText.
 * @param end       Character offset where the selection ends in fullText.
 */
export function extractContext(
  fullText: string,
  start: number,
  end: number,
  opts: ExtractOptions = {},
): ExtractedContext {
  const sentencesEachSide = opts.sentencesEachSide ?? 1;
  const maxContextChars = opts.maxContextChars ?? 1200;

  const text = fullText;
  const a = Math.max(0, Math.min(start, text.length));
  const b = Math.max(a, Math.min(end, text.length));
  const selection = text.slice(a, b).trim();

  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return { selection, before: "", after: "", context: selection || text.trim() };
  }

  // Which sentence spans does the selection overlap?
  let firstIdx = -1;
  let lastIdx = -1;
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const overlaps = a < s.end && b > s.start;
    if (overlaps) {
      if (firstIdx === -1) firstIdx = i;
      lastIdx = i;
    }
  }
  if (firstIdx === -1) {
    // Selection sits between detected sentences; fall back to nearest.
    firstIdx = lastIdx = Math.min(
      sentences.length - 1,
      sentences.findIndex((s) => s.start >= a) === -1
        ? sentences.length - 1
        : sentences.findIndex((s) => s.start >= a),
    );
  }

  const beforeStart = Math.max(0, firstIdx - sentencesEachSide);
  const afterEnd = Math.min(sentences.length - 1, lastIdx + sentencesEachSide);

  const before = sentences
    .slice(beforeStart, firstIdx)
    .map((s) => s.text)
    .join(" ")
    .trim();
  const after = sentences
    .slice(lastIdx + 1, afterEnd + 1)
    .map((s) => s.text)
    .join(" ")
    .trim();

  const contextStart = sentences[beforeStart].start;
  const contextEnd = sentences[afterEnd].end;
  const context = clamp(text.slice(contextStart, contextEnd).trim(), maxContextChars);

  return { selection, before, after, context };
}
