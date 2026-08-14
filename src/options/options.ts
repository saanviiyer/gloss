// Options page: stores the API key + preferences in chrome.storage.local.

import { getSettings, saveSettings } from "../lib/settings.js";
import { STYLES, type Style } from "../lib/types.js";

const keyEl = document.getElementById("apiKey") as HTMLInputElement;
const modelEl = document.getElementById("model") as HTMLInputElement;
const styleEl = document.getElementById("style") as HTMLSelectElement;
const lengthEl = document.getElementById("maxLength") as HTMLInputElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const modeEl = document.getElementById("mode") as HTMLDivElement;

for (const s of STYLES) {
  const opt = document.createElement("option");
  opt.value = s;
  opt.textContent = s === "eli5" ? "ELI5" : s.charAt(0).toUpperCase() + s.slice(1);
  styleEl.appendChild(opt);
}

function renderMode(hasKey: boolean) {
  modeEl.textContent = hasKey
    ? "API key set. Explanations use the Anthropic API."
    : "No API key. Running in mock mode (placeholder explanations).";
  modeEl.className = hasKey ? "mode set" : "mode mock";
}

async function load() {
  const s = await getSettings();
  keyEl.value = s.apiKey;
  modelEl.value = s.model;
  styleEl.value = s.style;
  lengthEl.value = String(s.maxLength);
  renderMode(s.apiKey.trim().length > 0);
}

saveBtn.addEventListener("click", async () => {
  const maxLength = Math.max(20, Math.min(400, Number(lengthEl.value) || 90));
  const saved = await saveSettings({
    apiKey: keyEl.value.trim(),
    model: modelEl.value.trim() || "claude-haiku-4-5",
    style: styleEl.value as Style,
    maxLength,
  });
  lengthEl.value = String(saved.maxLength);
  renderMode(saved.apiKey.trim().length > 0);
  statusEl.textContent = "Saved.";
  window.setTimeout(() => (statusEl.textContent = ""), 1500);
});

document.getElementById("open-reader")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.open(chrome.runtime.getURL("reader/reader.html"), "_blank");
});

void load();
