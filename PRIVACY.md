# gloss privacy policy

gloss does not collect, sell, or remotely store personal data.

When a user explicitly asks gloss to explain selected text, the selected text,
limited surrounding context, and the user's API key are sent directly from the
browser to Anthropic's Messages API. Anthropic processes that request under its
own terms and privacy policy. No request is sent when gloss is in mock mode.

The API key, preferences, and (when enabled) the latest 100 explanation-history
items are stored locally using `chrome.storage.local`. History can be disabled
in Settings or cleared from the toolbar popup. Saved source URLs omit query
strings and fragments.
They are not transmitted to the developer or any third party other than
Anthropic as required to fulfill an explanation request. Removing the extension
removes its locally stored data.

gloss does not use analytics, advertising, tracking, or a developer-operated
backend. It requests access to page text so it can detect and explain the text
the user selects. It requests access to `api.anthropic.com` solely to make the
user-requested explanation call.

For privacy questions, use the support contact listed in the extension's store
listing.
