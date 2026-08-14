// chrome.storage-backed settings helpers. Imports chrome, so not used by tests.

import { DEFAULT_SETTINGS, type Settings } from "./types.js";

const KEY = "gloss:settings";

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(KEY);
  const raw = (stored?.[KEY] ?? {}) as Partial<Settings>;
  return { ...DEFAULT_SETTINGS, ...raw };
}

export async function saveSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...partial };
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}
