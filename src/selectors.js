// Where GemTrin looks on gemini.google.com.
//
// A "chain" lists CSS selectors to try in order: the first entry that matches
// anything wins. When Google changes the page, put the new selector at the
// front and keep the old ones behind it. The Context tab's "Page check" shows
// which entry of each chain matched, so a broken chain is easy to spot.
//
// The three "skip" lists (hidden, thoughts, noise) are different: every entry
// is used, and text inside any of them is never counted.
//
// How sure each chain is (checked 2026-11-10):
//   reported   used by open-source Gemini tools: user-query, model-response,
//              message-content, .query-text, chat-window, rich-textarea .ql-editor,
//              code-block, .code-block-decoration, [data-test-id="code-content"],
//              and the visually hidden "Gemini said" label inside model-response.
//              Sources: github.com/Kohzadi2023/virtual-company-roundtable (PR #28),
//              github.com/mailming/gemini-chat-userscript,
//              github.com/rashidazarang/chatgpt-chat-exporter.
//   guessed    no public source found, so plausible names come first and generic
//              fallbacks follow: upload chips, Canvas chips and panel, images in
//              replies, the thinking panel, the composer area, the sign-in link.
// None of it was checked on a live, signed-in gemini.google.com page.
globalThis.GTR_SEL = {
  // The scrolling conversation (reported: chat-window).
  transcript: ['chat-window infinite-scroller', 'chat-window', '#chat-history', 'main'],

  // One turn each. A model turn also holds a hidden "Gemini said" label, so the
  // answer text is read from modelText inside it (reported).
  userTurn: ['user-query', '[data-test-id="user-query"]', '[data-message-author-role="user"]'],
  userText: ['.query-text', '.query-text-line', '[data-test-id="query-text"]'],
  modelTurn: ['model-response', '[data-test-id="model-response"]', '[data-message-author-role="model"]'],
  modelText: ['message-content', '.model-response-text', '.markdown'],

  // Skip lists: never counted as conversation text.
  hidden: ['.cdk-visually-hidden', '.visually-hidden', '.sr-only', '[class*="visually-hidden"]', '.katex-mathml'],
  thoughts: ['model-thoughts', '.thoughts-container', '[data-test-id*="thought" i]'],
  noise: ['button', 'mat-icon', '.mat-icon', '.google-symbols', 'svg', 'style', 'script', 'template', 'noscript'],

  // Files the reader attached, shown as chips in their turn (guessed).
  uploadChip: [
    'uploader-file-preview',
    'user-query-file-preview',
    'file-preview',
    '[data-test-id*="file-preview" i]',
    '[data-test-id*="uploaded-file" i]',
    '.file-preview-container > *',
  ],
  uploadName: ['.file-name', '[data-test-id="file-name"]', '.name'],

  // Canvas and Deep Research documents appear in a reply as a chip that opens
  // the side panel (guessed).
  canvasChip: [
    'immersive-entry-chip',
    '[data-test-id*="immersive-entry" i]',
    '.immersive-entry-chip',
    '[data-test-id*="immersive" i]',
  ],
  canvasTitle: ['[data-test-id="artifact-text"]', '.title-text', '.chip-title', 'h2, h3, h4'],
  canvasPanel: [
    'immersive-panel',
    'code-immersive-panel',
    'deep-research-immersive-panel',
    '[data-test-id*="immersive-panel" i]',
  ],

  // Code blocks in replies (reported: code-block, its decoration header with the
  // language, and the code element).
  codeBlock: ['code-block', '[data-test-id*="code-block" i]', 'pre'],
  codeLang: ['.code-block-decoration', '[class*="code-block-decoration"]', '[data-test-id*="code-language" i]'],
  codeContent: ['[data-test-id="code-content"]', 'code', 'pre'],

  // Images in replies: generated ones first, then any picture in the answer
  // (guessed). Tiny images such as icons are left out by size in dom.js.
  generatedImage: [
    'generated-image img',
    'single-image img',
    '.generated-image img',
    '[data-test-id*="generated-image" i] img',
    'message-content img',
  ],

  // The message box (reported: a Quill editor inside rich-textarea).
  composer: [
    'rich-textarea .ql-editor[contenteditable="true"]',
    'rich-textarea [contenteditable="true"]',
    'div.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'textarea',
  ],
  // The box around it, where files waiting to be sent show up (guessed).
  composerArea: ['input-area-v2', 'input-container', '.input-area-container', 'fieldset', 'form'],

  // A signed-out visitor sees a sign-in link and no message box (guessed).
  signIn: [
    'a[href*="accounts.google.com/ServiceLogin"]',
    'a[href*="accounts.google.com/v3/signin"]',
    'a[href*="accounts.google.com/signin"]',
    'a[href*="accounts.google.com/AccountChooser"]',
  ],
};
