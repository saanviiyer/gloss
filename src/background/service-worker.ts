// Background service worker: owns the network call (avoids page CORS), the
// context menu, and the keyboard command.

import { explain } from "../lib/explain.js";
import { getSettings } from "../lib/settings.js";
import {
  MSG_EXPLAIN,
  MSG_EXPLAIN_SELECTION,
  type ExplainResponse,
  type GlossMessage,
} from "../lib/messaging.js";

const CONTEXT_MENU_ID = "gloss-explain";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Explain with gloss",
    contexts: ["selection"],
  });
});

// Right-click "Explain with gloss": ask the content script to run the flow for
// the live selection (it has the full range + surrounding context).
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID && tab?.id != null) {
    chrome.tabs
      .sendMessage(tab.id, { type: MSG_EXPLAIN_SELECTION })
      .catch(() => void 0);
  }
});

// Keyboard shortcut (Alt+E by default).
chrome.commands.onCommand.addListener((command) => {
  if (command !== "explain-selection") return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: MSG_EXPLAIN_SELECTION }).catch(() => void 0);
    }
  });
});

// Explanation requests from content script / reader.
chrome.runtime.onMessage.addListener((message: GlossMessage, _sender, sendResponse) => {
  if (message?.type !== MSG_EXPLAIN) return false;

  (async () => {
    try {
      const settings = await getSettings();
      const result = await explain({
        ctx: message.ctx,
        apiKey: settings.apiKey,
        model: settings.model,
        style: settings.style,
        maxLength: settings.maxLength,
      });
      const response: ExplainResponse = { ok: true, text: result.text, mock: result.mock };
      sendResponse(response);
    } catch (err) {
      const response: ExplainResponse = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
      sendResponse(response);
    }
  })();

  // Keep the message channel open for the async response.
  return true;
});
