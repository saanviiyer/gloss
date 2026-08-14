// Shared UI + selection handling for both the in-page content script and the
// bundled PDF reader. Renders a floating "Explain" button near a selection and
// a result card with loading / explanation / copy states.

import { extractContext, type ExtractedContext } from "../lib/context.js";
import { MSG_EXPLAIN, type ExplainResponse } from "../lib/messaging.js";

const MIN_CHARS = 2;
const MAX_CHARS = 4000;

/** Build an ExtractedContext from a live DOM Selection. */
export function contextFromSelection(sel: Selection | null): ExtractedContext | null {
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const selected = sel.toString().replace(/\s+/g, " ").trim();
  if (selected.length < MIN_CHARS || selected.length > MAX_CHARS) return null;

  const range = sel.getRangeAt(0);
  let container: Node | null = range.commonAncestorContainer;
  if (container && container.nodeType === Node.TEXT_NODE) {
    container = container.parentElement;
  }
  // Walk up to a reasonably sized block for context.
  let block: HTMLElement | null = (container as HTMLElement) ?? null;
  while (
    block &&
    block.parentElement &&
    (block.textContent ?? "").replace(/\s+/g, " ").trim().length < selected.length + 40
  ) {
    block = block.parentElement;
  }

  const blockText = (block?.textContent ?? selected).replace(/\s+/g, " ").trim();
  const idx = blockText.indexOf(selected);
  if (idx === -1) {
    return { selection: selected, before: "", after: "", context: selected };
  }
  return extractContext(blockText, idx, idx + selected.length);
}

type SendExplain = (ctx: ExtractedContext) => Promise<ExplainResponse>;

/** Default sender: routes through the background worker (avoids page CORS). */
export const backgroundSender: SendExplain = (ctx) =>
  chrome.runtime.sendMessage({ type: MSG_EXPLAIN, ctx }) as Promise<ExplainResponse>;

interface GlossController {
  explainCurrentSelection: () => void;
}

export function installGloss(opts?: {
  root?: Document;
  win?: Window;
  send?: SendExplain;
}): GlossController {
  const doc = opts?.root ?? document;
  const win = opts?.win ?? window;
  const send = opts?.send ?? backgroundSender;

  let button: HTMLButtonElement | null = null;
  let card: HTMLElement | null = null;
  let lastCtx: ExtractedContext | null = null;

  function removeButton() {
    button?.remove();
    button = null;
  }

  function removeCard() {
    card?.remove();
    card = null;
  }

  function keepSelection(el: HTMLElement) {
    el.addEventListener("mousedown", (e) => e.preventDefault());
  }

  function positionAt(el: HTMLElement, rect: DOMRect) {
    const top = Math.max(6, rect.top - 8);
    const left = Math.min(win.innerWidth - 260, Math.max(6, rect.left));
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  }

  function showButton(rect: DOMRect, ctx: ExtractedContext) {
    removeButton();
    lastCtx = ctx;
    button = doc.createElement("button");
    button.className = "gloss-btn";
    button.type = "button";
    button.textContent = "Explain";
    keepSelection(button);
    button.style.top = `${Math.max(6, rect.bottom + 6)}px`;
    button.style.left = `${Math.min(win.innerWidth - 100, Math.max(6, rect.left))}px`;
    button.addEventListener("click", () => {
      if (lastCtx) showCard(rect, lastCtx);
    });
    doc.body.appendChild(button);
  }

  function showCard(rect: DOMRect, ctx: ExtractedContext) {
    removeButton();
    removeCard();
    card = doc.createElement("div");
    card.className = "gloss-card";
    keepSelection(card);

    const header = doc.createElement("div");
    header.className = "gloss-card-header";
    const title = doc.createElement("span");
    title.className = "gloss-card-title";
    title.textContent = "gloss";
    const close = doc.createElement("button");
    close.className = "gloss-card-close";
    close.type = "button";
    close.textContent = "×";
    close.title = "Close";
    close.addEventListener("click", removeCard);
    header.appendChild(title);
    header.appendChild(close);

    const bodyEl = doc.createElement("div");
    bodyEl.className = "gloss-card-body";
    bodyEl.textContent = "Explaining…";

    const footer = doc.createElement("div");
    footer.className = "gloss-card-footer";
    const copy = doc.createElement("button");
    copy.className = "gloss-copy";
    copy.type = "button";
    copy.textContent = "Copy";
    copy.disabled = true;
    footer.appendChild(copy);

    card.appendChild(header);
    card.appendChild(bodyEl);
    card.appendChild(footer);
    positionAt(card, rect);
    doc.body.appendChild(card);

    send(ctx)
      .then((res) => {
        if (!card) return;
        if (res && res.ok && typeof res.text === "string") {
          bodyEl.textContent = res.text;
          if (res.mock) {
            const tag = doc.createElement("div");
            tag.className = "gloss-mock-tag";
            tag.textContent = "mock mode";
            header.insertBefore(tag, close);
          }
          copy.disabled = false;
          copy.addEventListener("click", () => {
            void navigator.clipboard.writeText(res.text ?? "").then(() => {
              copy.textContent = "Copied";
              win.setTimeout(() => (copy.textContent = "Copy"), 1200);
            });
          });
        } else {
          bodyEl.textContent = res?.error ?? "Something went wrong.";
          bodyEl.classList.add("gloss-error");
        }
      })
      .catch((err) => {
        if (!card) return;
        bodyEl.textContent = err instanceof Error ? err.message : String(err);
        bodyEl.classList.add("gloss-error");
      });
  }

  function onSelectionSettled() {
    const sel = win.getSelection();
    const ctx = contextFromSelection(sel);
    if (!ctx || !sel) {
      removeButton();
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      removeButton();
      return;
    }
    showButton(rect, ctx);
  }

  doc.addEventListener("mouseup", () => win.setTimeout(onSelectionSettled, 0));
  doc.addEventListener("selectionchange", () => {
    const sel = win.getSelection();
    if (!sel || sel.isCollapsed) removeButton();
  });
  doc.addEventListener("mousedown", (e) => {
    const target = e.target as Node | null;
    if (card && target && !card.contains(target)) removeCard();
    if (button && target && !button.contains(target)) removeButton();
  });

  function explainCurrentSelection() {
    const sel = win.getSelection();
    const ctx = contextFromSelection(sel);
    if (!ctx || !sel) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    showCard(rect, ctx);
  }

  return { explainCurrentSelection };
}
