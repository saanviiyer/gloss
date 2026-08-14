// Content script: wires the shared gloss UI into any web page and listens for
// the keyboard command / context-menu trigger relayed by the background worker.

import { installGloss } from "../shared/gloss-ui.js";
import { MSG_EXPLAIN_SELECTION, type GlossMessage } from "../lib/messaging.js";

const controller = installGloss();

chrome.runtime.onMessage.addListener((message: GlossMessage) => {
  if (message?.type === MSG_EXPLAIN_SELECTION) {
    controller.explainCurrentSelection();
  }
  return false;
});
