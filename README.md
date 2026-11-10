# GemTrin

A browser extension (Manifest V3) that adds a side panel to `gemini.google.com`.
It is built after [groundtron-side-tree](../groundtron-side-tree) (the same panel, layout and
habits, made for Claude) and reworked for Gemini: what Gemini's page shows, Google's own
prompting advice, and the Gemini app's context limits.

It reads only the page that is already on screen, sends nothing anywhere and asks for no
permissions. Polish version: [readme/pl.md](readme/pl.md).

## What the panel shows

**Status bar, at the top.** About how many tokens the conversation takes, against the window
of your Google AI plan (`≈ 18.2k / 32k tok · 57%`), turning yellow at half and red at 80 %.
When Gemini's latest replies contain a task list (`☑ / ☐`, `- [x] / - [ ]`), a progress bar
below shows how much of it is done. Click the bar for the Context tab, or `×` to fold the panel
to a handle on the edge of the window. The handle keeps the usage colour as a dot.

**Files.** What the conversation received and produced, as a tree:

| Folder | What | Mark |
| --- | --- | --- |
| Attached | files you attached (chips in your messages) | `↑` blue |
| Canvas | Canvas and Deep Research documents (chips in replies) | `✚` green when created, `●` violet once it came back changed |
| Code | code blocks that name a file, as a path tree | `✚` / `●` as above |
| Images | images in replies | `▣` yellow |

A code block is named by its first comment (`// file: src/app.ts`, `# lib/format.py`,
`<!-- index.html -->`) or by the line just before it ("Put this in `utils/dates.py`:"). Words
that only look like files (`object.Property`, `v2.1.3`, `onet.pl`, an e-mail address) never
are. Code blocks that name no file are hidden behind the **snippets** toggle.

A row flashes when Gemini adds or changes its item and keeps a side mark for 8 seconds;
**follow** scrolls the tree to the newest one. Clicking a row scrolls the page to the item,
which blinks. A Canvas row clicks the Canvas chip, so Gemini opens the document itself. While a
Canvas is open, the panel steps aside to its handle and comes back when the Canvas closes.

**Hints.** Write in Gemini's message box as usual. Nine checks tick off as your draft covers
them, taken from Google's guidance:

- **role** (persona), **task stated directly**, **context**, **format**: the four parts of
  Google's *Prompting guide 101*, and *be precise and direct* from the Gemini 3 advice;
- **limits** and **an example**: constraints and few-shot examples from *Prompt design
  strategies* ("We recommend to always include few-shot examples");
- **separate the parts**: XML tags *or* Markdown headings, one style, not both;
- **question last**: for long drafts only, the material first and the question at the end,
  as in the *Long context* guide;
- **ask for the depth you want**: Gemini 3 answers briefly unless asked otherwise.

A missing check says why it helps; clicking it puts an example into the box. Above the checks,
a word count compares your draft with the guide's "successful prompts average about 21 words".
Below them are seven ready-made prompts (summarize a PDF, compare documents, a Deep Research
brief, a Canvas draft, explain code, rewrite an email, long document with the question last)
and the principles behind the checks, with links to the sources. The ticks come from your
words, so they are a hint, not a grade.

**Context.** Pick your plan (the page does not reveal it), and see what is counted: your
messages, Gemini's replies, images, files that cannot be counted, the draft in the box, the
longest reply (click to jump to it), and tips as the window fills up. A **Page check** lists
which selector found each part of the page. That is the first place to look when Gemini's page
changes.

## The numbers, and where they come from

| | Value | Source |
| --- | --- | --- |
| Context window, no plan | 32k tokens | Gemini Apps Help Center, *Gemini Apps limits & upgrades* |
| AI Plus | 128k tokens | same |
| AI Pro, AI Ultra | 1M tokens | same |
| Text | ≈ 4 characters per token; 100 tokens ≈ 60–80 English words | Gemini API, *Understand and count tokens* |
| Image | 258 tokens up to 384 px; larger ones in 768 × 768 tiles of 258 | same |
| API, for reference | 1,048,576 input / 65,536 output (Gemini 3 and 2.5) | same |
| "Successful prompts average ~21 words" | | *Prompting guide 101* (seen in coverage of the guide) |

All of it lives in [`src/limits.js`](src/limits.js) with the date it was checked
(2026-11-10). When Google changes a limit, that is the only file to edit.

These are **estimates**. The extension never sees the real token count. It counts only the
text visible on the page and only turns already loaded (scroll up in a long chat to load
older ones). It does not count file contents, Gemini's hidden thinking, Canvas contents or Gem
instructions. Languages other than English usually take more tokens than 4 characters each.

## Install

### Chrome, Edge, Brave

1. Open `chrome://extensions` (`edge://extensions`, `brave://extensions`) and turn on
   **Developer mode**.
2. Click **Load unpacked** and pick this folder.

Chrome may warn about the unknown key `browser_specific_settings`. That key is for Firefox,
and the extension works anyway.

### Firefox (128 or newer)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and pick `manifest.json` in this folder.

A temporary add-on is gone after a restart; to keep it, sign it on `addons.mozilla.org`. The
manifest declares that the add-on collects no data (`data_collection_permissions: none`).
Firefox may ask you to allow it on `gemini.google.com`.

## Permissions and privacy

None. `manifest.json` has no `permissions` or `host_permissions`. The content script runs on
`https://gemini.google.com/*` only. The panel's own settings (folded or not, tab, width,
language, plan, folded folders) are kept in that page's `localStorage` under keys starting
with `gtr:`. Nothing is sent anywhere, and the panel never types or sends a message on its own:
the ready-made prompts only go into the box when you click them.

The panel is built with `createElement` and `textContent` only, never with HTML strings, so it
keeps working on pages that enforce Trusted Types, as Google's pages often do.

## Languages

English and Polish, picked from the browser language and switchable at the right end of the
tab bar. Each language is one file in [`src/i18n`](src/i18n); `test/unit.html` checks that
every language has every text. The manifest's name and description are in
[`_locales`](_locales).

## When Gemini's page changes

Every selector GemTrin uses is in [`src/selectors.js`](src/selectors.js), as chains tried in
order. The Context tab's **Page check** shows which entry of each chain matched. When a row
there says *not seen* while the page clearly has that thing, open DevTools on the element, put
a selector for it at the front of that chain, and reload the extension.

## What has not been checked

- **The live gemini.google.com page.** Everything was tested on `test/harness.html`, which
  copies the structure reported by open-source Gemini tools (`user-query`, `model-response`,
  `message-content`, `code-block`, `rich-textarea .ql-editor`). Those parts are likely right.
  The selectors for **attached-file chips, Canvas chips and panel, images in replies, the
  thinking panel and the sign-in link** are educated guesses with generic fallbacks: no public
  source documents them. Check the Page check on a real chat first.
- **Loading in a real browser** (Chrome's *Load unpacked*, Firefox's temporary add-on). The
  manifest, files and script order are checked by `test/unit.html`, but the extension has not
  been installed and opened on Gemini.
- **A real phone.** The narrow layout was checked in a 500 px window only.
- **The "~21 words" figure** comes from coverage of Google's *Prompting guide 101*; the guide's
  own page did not load during research.

## Tests

From this folder:

```bash
python -m http.server 8731
```

- `http://127.0.0.1:8731/test/unit.html`: about 170 checks of the estimator, the prompt checks, the
  file-name rules, both languages, the selectors, the manifest, and a scan of the sources for
  HTML strings or `eval`.
- `http://127.0.0.1:8731/test/harness.html`: a fake Gemini chat with the real panel on it.
  Buttons at the bottom stream a reply with a code block, attach a file, update a Canvas, add
  an image, fill the draft, switch theme, open a Canvas, change the chat and sign out. In the
  console, `gtrCheck()` compares what the panel found with what the page holds.
- `http://127.0.0.1:8731/test/harness.html?auto=1`: the same page runs a scripted scenario
  (41 checks) on its own and writes the result into the page and its title (`GTR PASS 41/41`).
  `?shot=files|hints|context|context-warn|light|collapsed|pl` sets up one state for a
  screenshot.

Both test pages turn on Trusted Types, so a stray `innerHTML` in the extension fails the run.

Headless, for example:

```bash
chrome --headless --window-size=1440,900 --virtual-time-budget=90000 --dump-dom "http://127.0.0.1:8731/test/harness.html?auto=1"
```

`test/` and `tools/` are not part of the extension; leave them out of a store upload.

## Files

```
manifest.json          MV3 manifest: no permissions, gemini.google.com only, Firefox settings
_locales/en|pl/        name and description for the browser's extension page
src/lang-default.js    the language a single-language build starts in
src/i18n/              base.js (registry), en.js, pl.js: every text the panel shows
src/limits.js          plan windows, token rules, sources, date checked
src/selectors.js       where to look on gemini.google.com, as fallback chains
src/prompts.js         the hint checks and the order of the ready-made prompts
src/estimate.js        token arithmetic, no DOM (tested on its own)
src/dom.js             reading the page: turns, text, files, Canvas, code, images, message box
src/content.js         the panel: tabs, status bar, rendering, watching the page, state
styles/panel.css       the look, scoped under #gtr-root, light and dark, phone, reduced motion
icons/                 icon.svg and the PNGs made from it
tools/make-icons.ps1   renders the PNGs (Windows, no extra tools)
test/unit.html         checks without the page
test/harness.html      a fake Gemini page with the real panel
```

Icons: `powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1`.

## Sources

- Gemini Apps Help Center: [Gemini Apps limits & upgrades](https://support.google.com/gemini/answer/16275805)
- Gemini API: [Understand and count tokens](https://ai.google.dev/gemini-api/docs/tokens),
  [Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies),
  [Long context](https://ai.google.dev/gemini-api/docs/long-context)
- Google Workspace: [Prompting guide 101](https://workspace.google.com/learning/content/gemini-prompt-guide)
- Gemini page structure, from open-source tools:
  [virtual-company-roundtable PR #28](https://github.com/Kohzadi2023/virtual-company-roundtable/pull/28),
  [gemini-chat-userscript](https://github.com/mailming/gemini-chat-userscript),
  [chatgpt-chat-exporter](https://github.com/rashidazarang/chatgpt-chat-exporter)
