// Toolbar popup: shows status (key set vs mock mode) and quick links.

import { getSettings } from "../lib/settings.js";

const statusEl = document.getElementById("status") as HTMLDivElement;
const modelEl = document.getElementById("model") as HTMLDivElement;

async function render() {
  const s = await getSettings();
  const hasKey = s.apiKey.trim().length > 0;
  statusEl.textContent = hasKey ? "API key set" : "Mock mode (no API key)";
  statusEl.className = hasKey ? "status set" : "status mock";
  modelEl.textContent = `Model: ${s.model}`;
}

document.getElementById("options")?.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

document.getElementById("reader")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.open(chrome.runtime.getURL("reader/reader.html"), "_blank");
});

void render();
