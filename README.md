# gloss

Highlight a sentence on a web page or in a PDF and an LLM explains what it means in a small tooltip. Built for researchers reading dense papers.

gloss is a Chrome / Edge extension (Manifest V3). It sends the highlighted text, plus a little surrounding context, to the Anthropic Messages API and shows a short explanation of the highlighted part in a clean card next to your selection.

## What it does

- Highlight text on any page and a small "Explain" button appears next to it. Click it to get an explanation.
- Press Alt+E to explain the current selection.
- Right-click a selection and choose "Explain with gloss".
- Read PDFs inside a bundled PDF.js viewer where the same highlight to Explain flow works.
- Runs in mock mode with no setup, so you can try the whole flow before adding a key.

## Build

Requirements: Node (18 or newer) and npm.

```
npm install
npm run build
```

The build output is the `dist/` directory. That is the loadable extension. `npm run build` type-checks with zero TypeScript errors, bundles with esbuild, copies the static pages, vendors the PDF.js worker, and generates the icons.

To run the unit tests:

```
npm test
```

## Load it in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Turn on "Developer mode" (top right).
4. Click "Load unpacked" and select the `dist/` directory.

The gloss icon appears in the toolbar. On Edge the steps are the same at `edge://extensions`.

## Set your API key

By default gloss runs in mock mode and returns a clearly labeled placeholder, so nothing is required to try it.

To get real explanations:

1. Click the gloss toolbar icon, then "Settings" (or right-click the icon and choose "Options").
2. Paste your Anthropic API key.
3. Optionally change the model, the explanation style (Plain, ELI5, Technical), and the max length.
4. Click Save.

The key is stored only in this browser via `chrome.storage.local`. It is never committed to this repository and never sent anywhere except directly to Anthropic.

The default model is a fast model suited to short explanations. You can set any current model id in Settings.

## Keyboard shortcut and context menu

- Keyboard shortcut: Alt+E explains the current selection. You can change it at `chrome://extensions/shortcuts`.
- Context menu: right-click a selection and choose "Explain with gloss".

Both routes use the same card UI as the "Explain" button, including the surrounding context that gets sent so the model explains the highlighted part in context.

## PDF reader (and the native viewer limitation)

Chrome's built-in PDF viewer does not expose text selections to extensions, so gloss cannot attach its highlight to Explain flow to a PDF opened in the native viewer. To work around this, gloss ships its own PDF reader page built on a bundled copy of PDF.js.

Open it from the popup ("PDF reader") or the Settings page ("Open the PDF reader"). In the reader you can:

- Open a local PDF file, or
- Paste a PDF URL, or
- Pass a URL directly with `reader/reader.html?file=<url>`.

The reader renders pages with a selectable text layer, so highlighting a sentence there triggers the same Explain flow as on a normal web page.

## Privacy

gloss collects nothing and has no server of its own. When you ask for an explanation, the highlighted text plus a little surrounding context and your API key are sent directly to the Anthropic API from the extension's background service worker. Nothing else is collected, stored remotely, or shared. Your API key stays in `chrome.storage.local` in your browser. In mock mode no network request is made at all.

## How it works

- The content script detects a selection, extracts the highlighted text plus surrounding sentence context, and shows the button and card.
- The background service worker owns the network call to `https://api.anthropic.com/v1/messages`, which avoids page CORS restrictions. It sends the `anthropic-dangerous-direct-browser-access: true` header that direct browser calls require, along with `x-api-key` and `anthropic-version`.
- If no API key is set, the explainer returns a labeled placeholder instead of calling the API.

The pure logic (context extraction, prompt construction, response parsing, and the mock explainer) lives in small modules under `src/lib/` and is covered by unit tests in `test/`.

## Project layout

```
src/
  background/service-worker.ts   background worker: API call, command, context menu
  content/content-script.ts      in-page selection UI wiring
  content/content.css            button and card styles
  lib/context.ts                 selection and context extraction (pure)
  lib/prompt.ts                  prompt construction (pure)
  lib/parse.ts                   API response parsing (pure)
  lib/explain.ts                 explainer: mock mode plus the API call
  lib/settings.ts                chrome.storage-backed settings
  lib/types.ts                   shared types and defaults
  lib/messaging.ts               message contract between scripts
  shared/gloss-ui.ts             selection handling and tooltip UI
  reader/reader.ts               bundled PDF.js reader
  options/                       options page
  popup/                         toolbar popup
  manifest.json                  MV3 manifest
test/                            vitest unit tests
build.mjs                        type-check, bundle, copy, icons
```
