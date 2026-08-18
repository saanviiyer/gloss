// Toolbar popup: shows status (key set vs mock mode) and quick links.

import { getSettings } from "../lib/settings.js";
import { clearHistory, exportForRxiver, getHistory } from "../lib/history.js";

const statusEl = document.getElementById("status") as HTMLDivElement;
const modelEl = document.getElementById("model") as HTMLDivElement;
const historyEl = document.getElementById("history") as HTMLDivElement;

async function renderHistory() {
  const entries = (await getHistory()).slice(0, 5);
  historyEl.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No explanations yet.";
    historyEl.appendChild(empty);
    return;
  }
  for (const entry of entries) {
    const item = document.createElement("article");
    item.className = "history-item";
    const selection = document.createElement("div");
    selection.className = "selection";
    selection.textContent = `“${entry.selection}”`;
    const explanation = document.createElement("div");
    explanation.className = "explanation";
    explanation.textContent = entry.explanation;
    const meta = document.createElement("div");
    meta.className = "history-meta";
    const source = document.createElement(entry.sourceUrl ? "a" : "span");
    source.textContent = entry.sourceTitle;
    if (source instanceof HTMLAnchorElement) {
      source.href = entry.sourceUrl;
      source.target = "_blank";
    }
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy";
    copy.addEventListener("click", () => {
      void navigator.clipboard.writeText(entry.explanation).then(() => {
        copy.textContent = "Copied";
      });
    });
    meta.append(source, copy);
    item.append(selection, explanation, meta);
    historyEl.appendChild(item);
  }
}

async function render() {
  const s = await getSettings();
  const hasKey = s.apiKey.trim().length > 0;
  statusEl.textContent = hasKey ? "API key set" : "Mock mode (no API key)";
  statusEl.className = hasKey ? "status set" : "status mock";
  modelEl.textContent = `Model: ${s.model}`;
  await renderHistory();
}

document.getElementById("clear-history")?.addEventListener("click", () => {
  void clearHistory().then(renderHistory);
});

document.getElementById("export-rxiver")?.addEventListener("click", () => {
  void getHistory().then((entries) => {
    const payload = JSON.stringify(exportForRxiver(entries), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rxiver-gloss-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  });
});

document.getElementById("options")?.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

document.getElementById("reader")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.open(chrome.runtime.getURL("reader/reader.html"), "_blank");
});

void render();
