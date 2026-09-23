# rxiver gloss

rxiver gloss is a Chrome and Edge extension for researchers who read dense papers. You highlight a sentence on a web page or in a PDF, and an LLM explains it in a small card next to the selection.

gloss is the reading companion for the rxiver workspace. It sends the highlighted text and a little surrounding context to the Anthropic Messages API.

## Features

- Highlight text on any page and click the "Explain" button that appears.
- Press Alt+E to explain the current selection. You can change the shortcut at `chrome://extensions/shortcuts`.
- Right-click a selection and choose "Explain with gloss".
- Read PDFs in a bundled PDF.js viewer. The same highlight and Explain flow works there.
- Optional local history of the latest 100 explanations. Saved source links have no query strings. You can copy an entry from the popup with one click.
- Export the full history in rxiver's versioned JSON format. In rxiver, open a collection and choose "Import from rxiver gloss". Highlights become excerpts and explanations become research notes.
- Mock mode with no setup, so you can try the whole flow before you add a key.

Every entry point uses the same card and sends the same surrounding context.

## Run it

You need Node 18 or newer and npm.

```bash
git clone https://github.com/saanviiyer/gloss
cd gloss
npm install
npm run build
```

The build writes the loadable extension to `dist/`. `npm run build` type-checks with zero TypeScript errors, bundles with esbuild, copies the static pages, vendors the PDF.js worker and generates the icons.

Tests:

```bash
npm test
```

Release package for the Chrome Web Store:

```bash
npm run package
```

This runs the tests and the build, then writes a deterministic archive to `release/rxiver-gloss-v<version>.zip`. The ZIP has the contents of `dist/` at its root, as extension stores require. `PRIVACY.md` has the disclosure text for the store listing.

### Load it in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Turn on "Developer mode" (top right).
4. Click "Load unpacked" and select `dist/`.

On Edge, use `edge://extensions` with the same steps.

## API key and settings

The extension has no environment variables. You set the key in the extension.

By default gloss runs in mock mode and returns a clearly labeled placeholder. To get real explanations:

1. Click the gloss toolbar icon, then "Settings". You can also right-click the icon and choose "Options".
2. Paste your Anthropic API key.
3. Optionally change the model, the style (Plain, ELI5, Technical) and the max length.
4. Click Save.

The key stays in this browser in `chrome.storage.local`. It is not in this repository, and it goes only to Anthropic. The default model is a fast model for short explanations. You can set any current model id in Settings.

## PDF reader

Chrome's built-in PDF viewer does not give extensions access to text selections. For this reason, gloss cannot work on a PDF in the native viewer. gloss has its own reader page built on a bundled copy of PDF.js.

Open the reader from the popup ("PDF reader") or from Settings ("Open the PDF reader"). You can open a local PDF file or paste a PDF URL. You can also pass a URL with `reader/reader.html?file=<url>`. The reader has a selectable text layer, so the Explain flow works as it does on a web page.

## Privacy

gloss collects nothing and has no server of its own. When you ask for an explanation, the extension's background service worker sends the highlighted text, a little surrounding context and your API key directly to the Anthropic API. Nothing else is collected, stored remotely or shared. In mock mode the extension makes no network request. See `PRIVACY.md` for the full policy.

## How it works

- The content script detects a selection and extracts the text and the surrounding sentence context. It shows the button and the card.
- The background service worker makes the call to `https://api.anthropic.com/v1/messages`, which avoids page CORS limits. It sends `x-api-key`, `anthropic-version` and the `anthropic-dangerous-direct-browser-access: true` header that direct browser calls need.
- With no API key, the explainer returns a labeled placeholder and does not call the API.

Small modules in `src/lib/` hold the pure logic (context extraction, prompt construction, response parsing, mock explainer). Unit tests in `test/` cover them.

## Layout

```
src/
  background/service-worker.ts   API call, keyboard command, context menu
  content/content-script.ts      in-page selection UI
  content/content.css            button and card styles
  lib/context.ts                 selection and context extraction (pure)
  lib/prompt.ts                  prompt construction (pure)
  lib/parse.ts                   API response parsing (pure)
  lib/explain.ts                 mock mode and the API call
  lib/history.ts                 local explanation history
  lib/settings.ts                chrome.storage settings
  lib/types.ts                   shared types and defaults
  lib/messaging.ts               messages between scripts
  shared/gloss-ui.ts             selection handling and card UI
  reader/reader.ts               bundled PDF.js reader
  options/                       options page
  popup/                         toolbar popup
  manifest.json                  MV3 manifest
test/                            Vitest unit tests
build.mjs                        type-check, bundle, copy, icons
package.mjs                      release ZIP
PRIVACY.md                       privacy policy for the store listing
```
