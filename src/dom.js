// Reading gemini.google.com. Everything that knows about the page's markup goes
// through the selector chains in selectors.js, so this file does not change
// when Google's markup does.
//
// The functions at the bottom (cleanPath, fileFromCode, fileFromText) are pure
// string helpers and are checked by test/unit.html.
globalThis.GTR_DOM = (() => {
  'use strict';
  const S = globalThis.GTR_SEL;
  const OWN = '#gtr-root';

  // --- chains ------------------------------------------------------------------

  const validSel = sel => {
    try { document.createDocumentFragment().querySelector(sel); return true; } catch { return false; }
  };
  const chains = {};
  const chain = concept => (chains[concept] ||= (S[concept] || []).filter(validSel));
  const joined = {};
  const anyOf = concept => (joined[concept] ??= chain(concept).join(','));

  // Which entry of each chain matched during the current read: the health row.
  let seen = {};
  function record(concept, index, selector) {
    if (!seen[concept] || seen[concept].index > index) seen[concept] = { index, selector };
  }
  const beginPass = () => { seen = {}; };
  const seenNow = () => ({ ...seen });

  // Drops nodes that sit inside another node of the same list.
  function outermost(nodes) {
    if (nodes.length < 2) return nodes;
    const set = new Set(nodes);
    return nodes.filter(n => {
      for (let p = n.parentElement; p; p = p.parentElement) if (set.has(p)) return false;
      return true;
    });
  }

  // The matches of the first selector of the chain that matches anything under
  // root, never inside the panel itself.
  function all(concept, root) {
    const list = chain(concept);
    for (let i = 0; i < list.length; i++) {
      let found;
      try { found = (root || document).querySelectorAll(list[i]); } catch { continue; }
      if (!found.length) continue;
      const out = outermost([...found].filter(n => !n.closest(OWN)));
      if (out.length) { record(concept, i, list[i]); return out; }
    }
    return [];
  }
  const first = (concept, root) => all(concept, root)[0] || null;

  const matches = (n, sel) => { try { return !!sel && n.matches(sel); } catch { return false; } };
  const visible = n => !!n && n.getClientRects().length > 0;

  // --- text --------------------------------------------------------------------

  let skipSel = null;
  function skip() {
    if (skipSel === null) {
      skipSel = [...chain('hidden'), ...chain('thoughts'), ...chain('noise'), ...chain('uploadChip'), ...chain('canvasChip'), ...chain('codeLang'), OWN].join(',');
    }
    return skipSel;
  }

  // The visible text under root, whitespace collapsed, leaving out hidden
  // labels, the thinking panel, icons, buttons and file chips.
  function textOf(root) {
    if (!root) return '';
    const sel = skip();
    const parts = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.nodeType === 1 ? (matches(n, sel) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : NodeFilter.FILTER_ACCEPT),
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push(n.nodeValue);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  // --- turns -------------------------------------------------------------------

  // Every turn on the page, in reading order: { role: 'user' | 'model', el, index }.
  function turns() {
    const list = [
      ...all('userTurn').map(el => ({ role: 'user', el })),
      ...all('modelTurn').map(el => ({ role: 'model', el })),
    ];
    list.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    list.forEach((t, i) => { t.index = i; });
    return list;
  }

  const turnSelector = () => [anyOf('userTurn'), anyOf('modelTurn')].filter(Boolean).join(',');

  // The text of one turn that counts towards the context: the prompt text of a
  // user turn, the answer of a model turn (never its hidden label).
  function turnText(turn) {
    const parts = all(turn.role === 'user' ? 'userText' : 'modelText', turn.el);
    return parts.length ? parts.map(textOf).join(' ') : textOf(turn.el);
  }

  // --- files and artifacts -------------------------------------------------------

  const EXT_TYPE = {};
  const types = {
    image: 'png jpg jpeg gif webp heic heif bmp svg tif tiff avif',
    pdf: 'pdf',
    audio: 'mp3 wav m4a aac ogg oga flac opus aiff',
    video: 'mp4 mov webm avi mkv mpeg mpg 3gp wmv',
    sheet: 'csv tsv xlsx xls ods',
    doc: 'docx doc txt md rtf odt pptx ppt odp epub html htm',
    code: 'js mjs cjs jsx ts tsx py rb go rs java kt swift c h cpp hpp cc cs php sh ps1 lua sql json yaml yml toml xml ipynb css scss vue svelte dart r scala',
  };
  for (const [type, exts] of Object.entries(types)) for (const e of exts.split(' ')) EXT_TYPE[e] = type;

  function imgSize(img) {
    if (!img) return { w: 0, h: 0 };
    return {
      w: img.naturalWidth || parseInt(img.getAttribute('width'), 10) || 0,
      h: img.naturalHeight || parseInt(img.getAttribute('height'), 10) || 0,
    };
  }
  // An icon or avatar is not a file. An image whose size is not known yet
  // (still loading) is given the benefit of the doubt.
  const bigEnough = img => {
    const { w, h } = imgSize(img);
    return (w === 0 && h === 0) || Math.max(w, h) >= 40;
  };

  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

  // The name a chip shows: its name element, else its label, title or alt.
  function labelOf(node, concept) {
    const named = concept ? first(concept, node) : null;
    const img = node.querySelector('img');
    return clean(named && named.textContent) ||
      clean(node.getAttribute('aria-label')) ||
      clean(node.getAttribute('title')) ||
      clean(node.querySelector('[title]') && node.querySelector('[title]').getAttribute('title')) ||
      clean(img && img.getAttribute('alt')) ||
      clean(textOf(node)).slice(0, 80);
  }

  function fileInfo(name, el, turn, img, forceType) {
    const ext = /\.([A-Za-z0-9]{1,8})$/.test(name) ? name.split('.').pop().toLowerCase() : '';
    const type = forceType || EXT_TYPE[ext] || (img ? 'image' : 'file');
    const { w, h } = imgSize(img);
    return { name, ext, type, el, turn, w, h };
  }

  // Files the reader attached, one entry per chip, in reading order.
  function uploads(turnList) {
    const out = [];
    const chipSel = anyOf('uploadChip');
    for (const t of turnList) {
      if (t.role !== 'user') continue;
      for (const chip of all('uploadChip', t.el)) {
        out.push(fileInfo(labelOf(chip, 'uploadName'), chip, t.index, chip.querySelector('img')));
      }
      // A picture shown in the turn outside any chip: pasted straight in.
      for (const img of t.el.querySelectorAll('img')) {
        if ((chipSel && img.closest(chipSel)) || img.closest(OWN) || !bigEnough(img)) continue;
        out.push(fileInfo(clean(img.getAttribute('alt')), img, t.index, img, 'image'));
      }
    }
    return out;
  }

  // Canvas and Deep Research chips in replies: { title, el, turn }.
  function canvases(turnList) {
    const out = [];
    for (const t of turnList) {
      if (t.role !== 'model') continue;
      for (const chip of all('canvasChip', t.el)) out.push({ title: labelOf(chip, 'canvasTitle'), el: chip, turn: t.index });
    }
    return out;
  }

  const NOT_LANG = /^(copy|code|kopiuj|kod|show|more|less|run|edit|download|pobierz|expand|collapse)$/i;
  function langOf(block) {
    const head = first('codeLang', block);
    if (head) {
      for (const w of textOf(head).split(/\s+/)) {
        if (/^[A-Za-z][\w#+.-]{0,19}$/.test(w) && !NOT_LANG.test(w)) return w.toLowerCase();
      }
    }
    const tagged = block.querySelector('[class*="language-"]');
    const m = tagged && /language-([\w#+-]+)/.exec(tagged.getAttribute('class') || '');
    return m ? m[1].toLowerCase() : '';
  }

  // The element right before a code block, climbing out of wrappers, as long as
  // it stays inside the turn and is not itself code.
  function nameFromContext(block, stop) {
    let n = block;
    while (n && n !== stop && !n.previousElementSibling) n = n.parentElement;
    const prev = n && n !== stop ? n.previousElementSibling : null;
    if (!prev) return null;
    const codeSel = anyOf('codeBlock');
    if (matches(prev, codeSel) || (codeSel && prev.querySelector(codeSel))) return null;
    const heading = /^H[1-6]$/.test(prev.tagName) || !!prev.querySelector('h1,h2,h3,h4,h5,h6');
    const codes = [...prev.querySelectorAll('code, strong, b')].map(c => c.textContent);
    return fileFromText(textOf(prev), { heading, codes });
  }

  // Code blocks in replies: { name (a file path or null), lang, el, turn, lines }.
  function codeBlocks(turnList) {
    const out = [];
    for (const t of turnList) {
      if (t.role !== 'model') continue;
      for (const block of all('codeBlock', t.el)) {
        const code = (first('codeContent', block) || block).textContent || '';
        out.push({
          name: fileFromCode(code) || nameFromContext(block, t.el),
          lang: langOf(block),
          el: block,
          turn: t.index,
          lines: code ? code.replace(/\n+$/, '').split('\n').length : 0,
        });
      }
    }
    return out;
  }

  // Images in replies: { name, el, turn, w, h }.
  function images(turnList) {
    const out = [];
    for (const t of turnList) {
      if (t.role !== 'model') continue;
      for (const node of all('generatedImage', t.el)) {
        const img = node.tagName === 'IMG' ? node : node.querySelector('img');
        if (!img || !bigEnough(img)) continue;
        const { w, h } = imgSize(img);
        out.push({ name: clean(img.getAttribute('alt')).slice(0, 60), el: img, turn: t.index, w, h });
      }
    }
    return out;
  }

  // --- the message box -------------------------------------------------------------

  function composer() {
    const list = chain('composer');
    for (let i = 0; i < list.length; i++) {
      let nodes;
      try { nodes = document.querySelectorAll(list[i]); } catch { continue; }
      for (const n of nodes) {
        if (!n.closest(OWN) && visible(n)) { record('composer', i, list[i]); return n; }
      }
    }
    return null;
  }

  function draftText() {
    const c = composer();
    if (!c) return '';
    return (c.tagName === 'TEXTAREA' ? c.value : c.innerText) || '';
  }

  // Files waiting in the message box, to be sent with the draft.
  function composerAttachments() {
    const c = composer();
    if (!c) return 0;
    const area = (anyOf('composerArea') && c.closest(anyOf('composerArea'))) || (c.parentElement && c.parentElement.parentElement);
    if (!area || area.querySelector(turnSelector() || 'user-query')) return 0;
    return all('uploadChip', area).length;
  }

  // --- the page as a whole -------------------------------------------------------

  // Whether a Canvas or Deep Research panel is open beside the chat.
  function canvasOpen() {
    for (const sel of chain('canvasPanel')) {
      let nodes;
      try { nodes = document.querySelectorAll(sel); } catch { continue; }
      for (const n of nodes) {
        if (n.closest(OWN)) continue;
        const r = n.getBoundingClientRect();
        if (r.width >= 200 && r.height >= 100) return true;
      }
    }
    return false;
  }

  // The panel is for people who can chat: a page with a message box always
  // counts, a page with only a sign-in link does not.
  const AUTH_PATH = /^\/(signin|sign-in|login|logout|auth)(\/|$)/i;
  function signedIn() {
    if (AUTH_PATH.test(location.pathname)) return false;
    if (composer()) return true;
    return !first('signIn');
  }

  function transcript() {
    return first('transcript');
  }

  // The conversation's title, from the tab title without the site name.
  function title() {
    const t = clean(document.title).replace(/\s*[-–—|]\s*(Google\s+)?Gemini\s*$/i, '').trim();
    return /^(Google\s+)?Gemini$/i.test(t) ? '' : t;
  }

  // The last task list in the latest replies: checkboxes, or lines written as
  // "- [x] a" / "☑ a" (done) and "- [ ] a" / "☐ a" (open). Two items at least.
  const TASK_LINE = /^\s*(?:[-*•]\s*)?(\[[xX ]\]|[☑✔✓✅☒☐□◻⬜])\s+\S/;
  const TASK_DONE = /^\s*(?:[-*•]\s*)?(\[[xX]\]|[☑✔✓✅☒])/;
  function checklist(turnList) {
    const models = turnList.filter(t => t.role === 'model').slice(-3).reverse();
    for (const m of models) {
      const boxes = [...m.el.querySelectorAll('input[type="checkbox"]')].filter(b => !b.closest(OWN));
      if (boxes.length >= 2) return { done: boxes.filter(b => b.checked).length, total: boxes.length };
      const lines = (m.el.innerText || m.el.textContent || '').split('\n');
      let run = [];
      let last = [];
      for (const line of lines) {
        if (TASK_LINE.test(line)) run.push(TASK_DONE.test(line));
        else if (line.trim() !== '') { if (run.length) last = run; run = []; }
      }
      if (run.length) last = run;
      if (last.length >= 2) return { done: last.filter(Boolean).length, total: last.length };
    }
    return null;
  }

  // --- pure helpers ------------------------------------------------------------------

  // The only endings that make a name a file. A dotted word such as
  // object.Property, a version or a domain is not on the list, so it is never
  // taken for a file, whatever it looks like. "pl" and "ai" are left out on
  // purpose: they are far more often domains than Perl or Illustrator files.
  const FILE_EXT = new Set((
    'pdf docx doc xlsx xls pptx ppt odt ods odp rtf txt md csv tsv ' +
    'js mjs cjs jsx ts tsx py rb go rs java kt kts swift c h cpp hpp cc cs php sh bash zsh ps1 bat cmd lua sql dart r scala ex exs hs ' +
    'html htm css scss sass less vue svelte ' +
    'json yaml yml toml ini cfg conf env xml ipynb gradle properties tf ' +
    'png jpg jpeg gif svg webp ico bmp zip tar gz tgz rar 7z'
  ).split(' '));

  // A path as the tree stores it (forward slashes), or null when it is not a
  // file. `loose` lets a path with a folder through without a known ending.
  function cleanPath(raw, loose) {
    if (!raw) return null;
    let p = String(raw).trim().replace(/^["'`<(\[]+|["'`>)\].,;:]+$/g, '');
    p = p.replace(/:\d+(?::\d+)?$/, ''); // file.ts:12:4
    if (!p || /^[a-z][\w+.-]*:\/\//i.test(p) || p.includes('://')) return null;
    if (/^[\w.+-]+@[\w-]+\./.test(p)) return null; // an e-mail address
    p = p.replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\.\//, '');
    if (p.length > 200 || p.length < 3 || !/[A-Za-z0-9]/.test(p)) return null;
    const name = p.split('/').pop() || '';
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    if (FILE_EXT.has(ext) && name.length > ext.length + 1) return p;
    return loose && p.includes('/') ? p : null;
  }

  // A file named by the first comment of a code block: "// file: src/app.ts",
  // "# lib/format.py", "<!-- index.html -->", "/* styles.css */". The comment
  // has to hold the name and nothing else, so "#include <stdio.h>" is not one.
  const NAME_LINE = /^\s*(?:\/\/+|#+|--|;+|%+|\/\*+|<!--|\{\/\*|')\s*(?:(?:file(?:name)?|path|plik)\s*[:=]?\s*)?([\w.@~+\\/-]+?)\s*(?:\*+\/\}?|-->)?\s*$/i;
  function fileFromCode(code) {
    const lines = String(code || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 2);
    for (const line of lines) {
      const m = NAME_LINE.exec(line);
      const p = m && cleanPath(m[1], false);
      if (p) return p;
    }
    return null;
  }

  // A file named by the line before a code block. A name in `code` or bold
  // counts when the line is short; a plain name only in a heading, a line
  // ending in a colon ("Here is the updated config.json:") or a very short line.
  const NAME_IN_TEXT = /(?:[A-Za-z]:)?[\w.@~+-]*(?:[\\/][\w.@+-]+)+|[\w@+-]+(?:\.[\w+-]+)*\.[A-Za-z0-9]{1,7}\b/g;
  function fileFromText(text, opts = {}) {
    const s = clean(text);
    if (!s || s.length > 300) return null;
    const marked = (opts.codes || []).map(c => cleanPath(c, false)).filter(Boolean);
    if (marked.length) return marked[marked.length - 1];
    if (!(opts.heading || /[:：]$/.test(s) || s.length <= 60)) return null;
    const hits = (s.match(NAME_IN_TEXT) || []).map(x => cleanPath(x, false)).filter(Boolean);
    return hits.length ? hits[hits.length - 1] : null;
  }

  return {
    all, first, beginPass, seen: seenNow, chain,
    turns, turnSelector, turnText, textOf, transcript,
    uploads, canvases, codeBlocks, images,
    composer, draftText, composerAttachments,
    canvasOpen, signedIn, title, checklist,
    cleanPath, fileFromCode, fileFromText,
  };
})();
