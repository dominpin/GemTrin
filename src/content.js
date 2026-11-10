// GemTrin: a panel on the right of gemini.google.com.
//
//  - Files: what the conversation received and produced, as a tree: the files
//    you attached, Canvas documents, code blocks that name a file, images in
//    replies. A row flashes when Gemini adds or updates it.
//  - Hints: what your draft still lacks, by Google's own prompting guidance
//    for Gemini, with ready-made prompts.
//  - Context: roughly how much of your plan's context window the
//    conversation fills.
//
// Everything is read from the page that is already on screen. Nothing is sent
// anywhere, and the only thing stored is this panel's own state, under keys
// beginning "gtr:" in the page's localStorage.
//
// Every figure is an estimate from the visible text. The extension never sees
// the real token count, the contents of your files or Gemini's hidden thinking.
//
// The panel is built with document.createElement and textContent only, never
// with HTML strings: Google pages commonly enforce Trusted Types, where an
// innerHTML assignment throws.
(() => {
  'use strict';
  if (window.__gtrLoaded) return;
  window.__gtrLoaded = true;

  const L = globalThis.GTR_LIMITS;
  const E = globalThis.GTR_EST;
  const D = globalThis.GTR_DOM;
  const P = globalThis.GTR_DOCS;
  const I18N = globalThis.GTR_I18N;

  // --- the look -------------------------------------------------------------------

  const PALETTE = {
    dark: { accent: '#C58AF9', success: '#6DD58C', warning: '#FFD15C', danger: '#FF8A80', info: '#7CACF8', muted: '#9AA0A6' },
    light: { accent: '#8430CE', success: '#146C2E', warning: '#8C5A00', danger: '#B3261E', info: '#0B57D0', muted: '#5F6368' },
  };

  // What happened to an item, and how its row shows it.
  const KINDS = {
    upload: { glyph: '↑' }, // you attached it
    write: { glyph: '✚' }, // Gemini created it
    edit: { glyph: '●' }, // Gemini changed it again later
    image: { glyph: '▣' }, // an image in a reply
    snippet: { glyph: '‹›' }, // a code block that names no file
  };
  const GROUPS = ['uploads', 'canvas', 'code', 'images'];
  const TABS = ['files', 'hints', 'context'];

  // --- state ------------------------------------------------------------------------

  function load(k, d) { try { return localStorage.getItem('gtr:' + k) ?? d; } catch { return d; } }
  function save(k, v) { try { localStorage.setItem('gtr:' + k, String(v)); } catch { /* storage blocked */ } }
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // On a phone the open panel would cover the page, so it starts folded to its handle.
  const narrow = () => window.matchMedia('(max-width: 700px)').matches;
  let collapsed = load('collapsed', narrow() ? '1' : '0') === '1';
  let autoHidden = false; // folded because a Canvas opened, not by the reader
  let tab = TABS.includes(load('tab', '')) ? load('tab', '') : 'files';
  let follow = load('follow', '1') === '1';
  let snippets = load('snippets', '0') === '1';
  let closedDirs = new Set((() => { try { return JSON.parse(load('closed', '[]')); } catch { return []; } })());
  let width = clamp(parseInt(load('width', '310'), 10) || 310, 240, 480);
  let planId = load('plan', L.defaultPlan);
  if (!L.plans.some(p => p.id === planId)) planId = L.defaultPlan;

  // The languages this build ships, and the one in use: the reader's choice,
  // else the build's default, else the browser's.
  const LANGS = (globalThis.GTR_LANG_ORDER || ['en', 'pl']).filter(c => I18N[c]);
  const FALLBACK = LANGS.includes('en') ? 'en' : LANGS[0]; // the language a missing text is taken from
  const langOk = v => LANGS.includes(v);
  let lang = (() => {
    if (LANGS.length === 1) return LANGS[0];
    const saved = load('lang', '');
    if (langOk(saved)) return saved;
    if (langOk(globalThis.GTR_DEFAULT_LANG)) return globalThis.GTR_DEFAULT_LANG;
    return LANGS.find(c => c !== 'en' && new RegExp('^' + c + '(-|$)', 'i').test(navigator.language || '')) || FALLBACK;
  })();
  const t = (k, ...a) => {
    const v = (I18N[lang] || {})[k] ?? (I18N[FALLBACK] || {})[k];
    return typeof v === 'function' ? v(...a) : v ?? k;
  };
  const fmt = n => E.fmtTokens(n, t('dec'));

  // What the conversation holds, rebuilt from the page on every read.
  const items = new Map(); // key -> { key, group, name, path, kind, count, el, turn }
  // What survives between reads: when an item was last added or changed.
  const meta = new Map(); // key -> { lastTs, count }
  let stats = E.summarize({});
  let biggest = null; // { turn, tokens, el }
  let health = { turns: 0, user: 0, model: 0, seen: {} };
  let checklist = null;
  let checklistAt = 0;
  let composerEl = null;
  // Whatever the page shows in the first moments of a conversation is history,
  // not activity: it gets no flash.
  let historyUntil = 0;
  let openedAt = 0; // when this conversation was opened
  let lastTurnCount = 0;
  // Characters of text per turn element, recounted only when the turn changes.
  const textCache = new WeakMap();
  const dirty = new Set();
  let dirtyAll = true;
  let convoKey = location.pathname;

  // --- reading the conversation -------------------------------------------------------

  const seg = s => String(s).replace(/\//g, '∕');

  function collect() {
    D.beginPass();
    const now = Date.now();
    const turnList = D.turns();
    // A saved chat can take longer than the history window to load. When the
    // first turns show up soon after a chat opened, whatever came with them is
    // history too. A new chat starts with your message alone, and Gemini's
    // reply arrives later, so that one still counts as activity.
    if (turnList.length && lastTurnCount === 0 && now - openedAt < 15000) historyUntil = Math.max(historyUntil, now + 1500);
    lastTurnCount = turnList.length;
    const live = now >= historyUntil;
    composerEl = D.composer();
    D.transcript();

    const found = new Map();
    const used = new Map(); // group -> names already taken, so every row has its own path
    const unique = (group, name) => {
      const taken = used.get(group) || new Set();
      used.set(group, taken);
      let out = name;
      for (let n = 2; taken.has(out); n++) out = `${name} (${n})`;
      taken.add(out);
      return out;
    };
    // The same key seen again counts up: a file sent twice, a Canvas updated.
    const add = (key, it) => {
      const prev = found.get(key);
      if (prev) { prev.count++; prev.el = it.el; prev.turn = it.turn; return; }
      const name = unique(it.group, it.name);
      const rel = it.group === 'code' && it.kind !== 'snippet' ? name : seg(name);
      found.set(key, { ...it, key, name, path: it.group + '/' + rel, count: 1 });
    };

    const ups = D.uploads(turnList);
    let pasted = 0;
    for (const u of ups) {
      const name = u.name || (u.type === 'image' ? t('imageN', ++pasted) : t('unnamedFile'));
      add('u:' + name, { group: 'uploads', name, kind: 'upload', type: u.type, el: u.el, turn: u.turn });
    }
    for (const c of D.canvases(turnList)) {
      const name = c.title || t('untitledCanvas');
      add('c:' + name, { group: 'canvas', name, kind: 'write', el: c.el, turn: c.turn });
    }
    const perLang = {};
    for (const b of D.codeBlocks(turnList)) {
      if (b.name) {
        add('f:' + b.name, { group: 'code', name: b.name, kind: 'write', el: b.el, turn: b.turn, lang: b.lang });
      } else {
        const lg = b.lang || 'code';
        perLang[lg] = (perLang[lg] || 0) + 1;
        add(`s:${lg}#${perLang[lg]}`, { group: 'code', name: `${lg} · ${perLang[lg]}`, kind: 'snippet', el: b.el, turn: b.turn, lang: b.lang });
      }
    }
    const imgs = D.images(turnList);
    imgs.forEach((im, i) => add('i:' + i, { group: 'images', name: im.name || t('imageN', i + 1), kind: 'image', el: im.el, turn: im.turn }));

    // A Canvas or a file that came back more than once was changed.
    for (const it of found.values()) {
      if (it.kind === 'write' && it.count > 1) it.kind = 'edit';
      const m = meta.get(it.key);
      if (!m) meta.set(it.key, { lastTs: live ? now : 0, count: it.count });
      else {
        if (it.count > m.count && live) m.lastTs = now;
        m.count = it.count;
      }
    }
    items.clear();
    for (const [k, v] of found) items.set(k, v);

    // The estimate: text per turn (cached), images by size, other files listed.
    let userChars = 0, modelChars = 0, nUser = 0, nModel = 0, big = null;
    for (const tu of turnList) {
      let c = dirtyAll || dirty.has(tu.el) ? undefined : textCache.get(tu.el);
      if (c === undefined) {
        c = D.turnText(tu).length;
        textCache.set(tu.el, c);
      }
      if (tu.role === 'user') { userChars += c; nUser++; } else {
        modelChars += c; nModel++;
        if (!big || c > big.chars) big = { chars: c, turn: tu.index, el: tu.el };
      }
    }
    dirty.clear();
    dirtyAll = false;
    const images = [...ups.filter(u => u.type === 'image'), ...imgs].map(x => E.imageTokens(x.w, x.h));
    stats = E.summarize({ userChars, modelChars, images, otherFiles: ups.filter(u => u.type !== 'image').length, nUser, nModel });
    biggest = big && big.chars > 0 ? { turn: big.turn, tokens: E.textTokens(big.chars), el: big.el } : null;
    health = { turns: turnList.length, user: nUser, model: nModel, seen: D.seen() };

    // The task list reads laid-out text, so it is refreshed less often.
    if (now - checklistAt > 1500) {
      checklistAt = now;
      checklist = D.checklist(turnList);
    }
  }

  let collectTimer = 0;
  let lastCollect = 0;
  function scheduleCollect() {
    if (collectTimer) return;
    const wait = Math.max(0, 300 - (Date.now() - lastCollect));
    collectTimer = setTimeout(() => {
      collectTimer = 0;
      lastCollect = Date.now();
      try { collect(); } catch (err) { console.warn('[GemTrin]', err); }
      paint();
    }, wait);
  }

  // --- the panel ------------------------------------------------------------------------

  // The one way this file makes elements: no HTML strings anywhere.
  const el = (tag, props = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style') for (const [p, val] of Object.entries(v)) n.style[p] = val;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const kid of [].concat(kids)) if (kid) n.appendChild(kid);
    return n;
  };

  function isLight() {
    const cls = `${document.body.className} ${document.documentElement.className}`;
    if (/\bdark[-_]?theme\b/i.test(cls)) return false;
    if (/\blight[-_]?theme\b/i.test(cls)) return true;
    for (const n of [document.body, document.documentElement]) {
      const m = (getComputedStyle(n).backgroundColor || '').match(/[\d.]+/g);
      if (m && m.length >= 3 && (m.length < 4 || +m[3] > 0.5)) return (+m[0] * 299 + +m[1] * 587 + +m[2] * 114) / 1000 > 140;
    }
    return !window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let ui = null;

  function build() {
    const rootEl = el('div', { id: 'gtr-root', 'data-collapsed': '0' });
    const handle = el('button', { class: 'gtr-tab', type: 'button', onclick: () => setCollapsed(false) }, [
      el('span', { class: 'gtr-tab-glyph', text: '◧' }),
      el('span', { class: 'gtr-tab-dot' }),
    ]);
    const meter = el('div', {
      class: 'gtr-meter', role: 'button', tabindex: '0',
      onclick: () => setTab('context'),
      onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTab('context'); } },
    });
    const m = {
      dot: el('span', { class: 'gtr-dot', text: '●' }),
      main: el('span', { class: 'gtr-m-main' }),
      sub: el('span', { class: 'gtr-m-sub' }),
      x: el('button', { class: 'gtr-x', type: 'button', text: '×', onclick: e => { e.stopPropagation(); setCollapsed(true); } }),
      fill: el('span', { class: 'gtr-usage-fill' }),
      progFill: el('span', { class: 'gtr-prog-fill' }),
    };
    m.usage = el('span', { class: 'gtr-usage' }, [m.fill]);
    m.prog = el('span', { class: 'gtr-prog' }, [el('span', { class: 'gtr-prog-track' }, [m.progFill])]);
    meter.append(m.dot, m.main, m.sub, m.x, m.usage, m.prog);

    const tabs = el('nav', { class: 'gtr-tabs', role: 'tablist' }, [
      ...TABS.map(id => el('button', { class: 'gtr-tabbtn', type: 'button', role: 'tab', 'data-tab': id, onclick: () => setTab(id) })),
      LANGS.length > 1 && el('select', { class: 'gtr-lang', onchange: e => setLang(e.currentTarget.value) },
        LANGS.map(c => el('option', { value: c, text: globalThis.GTR_LANG_NAMES[c] || c }))),
    ]);
    const body = el('div', { class: 'gtr-body', role: 'tabpanel' });
    const grip = el('div', { class: 'gtr-grip' });
    const panel = el('aside', { class: 'gtr-panel', onkeydown: e => { if (e.key === 'Escape') setCollapsed(true); } }, [grip, meter, tabs, body]);
    rootEl.append(handle, panel);
    document.body.appendChild(rootEl);
    dragToResize(grip);
    return { rootEl, handle, panel, meter, m, tabs, body, grip };
  }

  function dragToResize(grip) {
    // Pointer events, so a finger on a tablet drags it like a mouse does.
    let startX = 0, startW = 0, dragging = false;
    grip.addEventListener('pointerdown', e => { dragging = true; startX = e.clientX; startW = width; grip.setPointerCapture(e.pointerId); e.preventDefault(); });
    grip.addEventListener('pointermove', e => {
      if (!dragging) return;
      width = clamp(startW + (startX - e.clientX), 240, 480);
      ui.rootEl.style.setProperty('--gtr-w', width + 'px');
    });
    const end = () => { if (dragging) { dragging = false; save('width', width); } };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  }

  function setCollapsed(v) {
    collapsed = v;
    autoHidden = false;
    save('collapsed', v ? '1' : '0');
    paint();
  }
  function setTab(v) { tab = v; save('tab', v); paint(); }
  function setLang(v) {
    lang = v;
    save('lang', v);
    resetBody();
    paint();
  }

  let lastSig = '';
  let ctxSig = '';
  let hintRows = null;
  const rowEls = new Map(); // item key -> row element
  const seenTs = new Map(); // item key -> the lastTs its row last flashed for

  function resetBody() {
    lastSig = '';
    ctxSig = '';
    hintRows = null;
    rowEls.clear();
    if (ui) { ui.body.removeAttribute('data-tab'); ui.body.textContent = ''; }
  }

  function flashDone(node, how) {
    node.setAttribute('data-done', how);
    setTimeout(() => node.removeAttribute('data-done'), 1600);
  }

  // Scrolls the page to an element and makes it blink once.
  function showOnPage(target) {
    target.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
    target.classList.remove('gtr-jump');
    void target.offsetWidth; // restart the animation
    target.classList.add('gtr-jump');
    setTimeout(() => target.classList.remove('gtr-jump'), 2000);
  }

  // --- the files tab ----------------------------------------------------------------------

  function commonDir(paths) {
    if (paths.length === 0) return '';
    let pre = paths[0].split('/').slice(0, -1);
    for (const p of paths.slice(1)) {
      const parts = p.split('/').slice(0, -1);
      let i = 0;
      while (i < pre.length && i < parts.length && pre[i] === parts[i]) i++;
      pre = pre.slice(0, i);
      if (pre.length === 0) break;
    }
    return pre.join('/');
  }

  function treeOf(paths, prefix) {
    const rootNode = { name: '', dirs: new Map(), files: [] };
    for (const p of paths) {
      const rel = prefix && p.startsWith(prefix + '/') ? p.slice(prefix.length + 1) : p;
      const parts = rel.split('/');
      let node = rootNode;
      for (const part of parts.slice(0, -1)) {
        if (!node.dirs.has(part)) node.dirs.set(part, { name: part, dirs: new Map(), files: [] });
        node = node.dirs.get(part);
      }
      node.files.push({ name: parts[parts.length - 1], path: p });
    }
    return rootNode;
  }

  function rowsOf(node, depth, out, key) {
    for (const dir of [...node.dirs.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      const dirKey = key + '/' + dir.name;
      out.push({ kind: 'dir', name: dir.name, depth, key: dirKey });
      rowsOf(dir, depth + 1, out, dirKey);
    }
    for (const f of node.files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
      out.push({ kind: 'file', name: f.name, path: f.path, depth });
    }
    return out;
  }

  // A row opens what it stands for: a Canvas chip is clicked, so Gemini opens
  // the Canvas itself; anything else is scrolled to.
  function jump(key) {
    let it = items.get(key);
    if (it && (!it.el || !it.el.isConnected)) { collect(); it = items.get(key); }
    if (!it || !it.el) return;
    showOnPage(it.el);
    if (it.group === 'canvas') {
      const btn = it.el.matches('button, [role="button"], a') ? it.el : it.el.querySelector('button, [role="button"], a') || it.el;
      btn.click();
    }
  }

  const pad = depth => 6 + depth * 12 + 'px';

  function optBtn(label, on, title, onclick) {
    return el('button', { class: 'gtr-opt' + (on ? ' gtr-on' : ''), type: 'button', 'aria-pressed': String(on), text: label, title, onclick });
  }

  function dirRow(key, name, depth, count) {
    const closed = closedDirs.has(key);
    return el('div', { class: 'gtr-row gtr-dir', role: 'treeitem', 'aria-expanded': String(!closed), style: { paddingLeft: pad(depth) } }, [
      // Only the triangle folds and unfolds the folder.
      el('button', {
        class: 'gtr-glyph gtr-fold', type: 'button', text: closed ? '▸' : '▾', title: closed ? t('unfold') : t('fold'),
        onclick: () => {
          if (closedDirs.has(key)) closedDirs.delete(key); else closedDirs.add(key);
          save('closed', JSON.stringify([...closedDirs]));
          paint();
        },
      }),
      el('span', { class: 'gtr-name', text: name }),
      count ? el('span', { class: 'gtr-badge', text: String(count) }) : null,
    ]);
  }

  function fileRow(it, name, depth) {
    const r = el('div', {
      class: 'gtr-row gtr-file', role: 'treeitem', tabindex: '0', 'data-path': it.path, 'data-key': it.key,
      style: { paddingLeft: pad(depth) },
      onclick: () => jump(it.key),
      onkeydown: e => { if (e.key === 'Enter') jump(it.key); },
    }, [
      el('span', { class: 'gtr-glyph' }),
      el('span', { class: 'gtr-name', text: name }),
      el('span', { class: 'gtr-badge' }),
    ]);
    rowEls.set(it.key, r);
    return r;
  }

  function renderFiles(body) {
    const all = [...items.values()];
    const nSnip = all.filter(i => i.kind === 'snippet').length;
    const list = all.filter(i => snippets || i.kind !== 'snippet');
    const title = D.title();
    const sig = [lang, snippets, nSnip, title, [...closedDirs].sort().join(','), list.map(i => i.path).sort().join('|')].join('#');

    if (sig !== lastSig) {
      lastSig = sig;
      rowEls.clear();
      body.textContent = '';
      body.appendChild(el('div', { class: 'gtr-opts' }, [
        optBtn(t('follow'), follow, t('followTitle'), e => {
          follow = !follow;
          save('follow', follow ? '1' : '0');
          // The bar is only rebuilt when the list changes, so flip the look here.
          e.currentTarget.classList.toggle('gtr-on', follow);
          e.currentTarget.setAttribute('aria-pressed', String(follow));
          if (follow) scrollToNewest();
        }),
        optBtn(t('snippets', nSnip), snippets, t('snippetsTitle'), () => {
          snippets = !snippets;
          save('snippets', snippets ? '1' : '0');
          paint();
        }),
        el('span', { class: 'gtr-count', text: list.length ? t('count', list.length) : '' }),
      ]));
      if (title) body.appendChild(el('div', { class: 'gtr-title-line', text: title, title }));
      if (!list.length) {
        body.appendChild(el('p', { class: 'gtr-empty', text: nSnip ? t('emptySnippets', nSnip) : t('empty') }));
        return;
      }
      const tree = el('div', { class: 'gtr-tree', role: 'tree' });
      for (const g of GROUPS) {
        const inGroup = list.filter(i => i.group === g);
        if (!inGroup.length) continue;
        const gKey = '/' + g;
        tree.appendChild(dirRow(gKey, t('grp_' + g), 0, inGroup.length));
        if (closedDirs.has(gKey)) continue;
        const byRel = new Map(inGroup.map(i => [i.path.slice(g.length + 1), i]));
        const rels = [...byRel.keys()];
        // Code paths often share a folder; it is shown once above them.
        const prefix = g === 'code' ? commonDir(rels) : '';
        if (prefix) tree.appendChild(el('div', { class: 'gtr-root-line', text: prefix + '/', title: prefix, style: { paddingLeft: pad(1) } }));
        let hideBelow = Infinity; // depth of a folded folder whose contents are skipped
        for (const row of rowsOf(treeOf(rels, prefix), 1, [], gKey)) {
          if (row.depth > hideBelow) continue;
          hideBelow = Infinity;
          if (row.kind === 'dir') {
            if (closedDirs.has(row.key)) hideBelow = row.depth;
            tree.appendChild(dirRow(row.key, row.name, row.depth, 0));
          } else {
            tree.appendChild(fileRow(byRel.get(row.path), row.name, row.depth));
          }
        }
      }
      body.appendChild(tree);
    }

    // Always refresh what each row shows: colour, glyph, count, and a flash
    // when the item was added or changed since the last paint.
    const now = Date.now();
    let newest = null;
    for (const [key, r] of rowEls) {
      const it = items.get(key);
      if (!it) continue;
      const m = meta.get(key) || { lastTs: 0 };
      r.setAttribute('data-kind', it.kind);
      r.querySelector('.gtr-glyph').textContent = KINDS[it.kind].glyph;
      r.querySelector('.gtr-badge').textContent = it.count > 1 ? String(it.count) : '';
      const how = it.group === 'canvas' ? t('openCanvas') : t('scrollTo');
      r.title = `${it.name}\n${t('kind_' + it.kind)} · ${t('turnN', it.turn + 1)}\n${how}`;
      if (m.lastTs && seenTs.get(key) !== m.lastTs) {
        seenTs.set(key, m.lastTs);
        r.classList.remove('gtr-flash');
        void r.offsetWidth; // restart the animation on a row that stayed
        r.classList.add('gtr-flash');
        if (!newest || m.lastTs > newest.ts) newest = { ts: m.lastTs, row: r };
      }
      r.classList.toggle('gtr-recent', !!m.lastTs && now - m.lastTs < 8000);
    }
    if (newest && follow) newest.row.scrollIntoView({ block: 'nearest' });
  }

  function scrollToNewest() {
    let last = null;
    for (const [key, r] of rowEls) {
      const m = meta.get(key);
      if (m && m.lastTs && (!last || m.lastTs > last.ts)) last = { ts: m.lastTs, row: r };
    }
    if (last) last.row.scrollIntoView({ block: 'center' });
  }

  // --- the meter ----------------------------------------------------------------------------

  function renderMeter() {
    const { m, meter, handle } = ui;
    const p = E.plan(planId);
    const u = E.usage(stats.total, p.tokens);
    meter.title = t('meterTitle');
    m.dot.setAttribute('data-tone', u.tone);
    m.main.textContent = t('meterMain', fmt(stats.total), fmt(p.tokens));
    m.sub.textContent = `${E.fmtPct(u.pct)} · ${t('plan_' + p.id)}`;
    m.x.title = t('close');
    m.x.setAttribute('aria-label', t('close'));
    m.fill.setAttribute('data-tone', u.tone);
    m.fill.style.width = Math.min(100, u.pct) + '%';
    handle.setAttribute('data-tone', u.tone);
    handle.title = `${t('open')} · ${t('meterMain', fmt(stats.total), fmt(p.tokens))}`;
    handle.setAttribute('aria-label', handle.title);
    if (checklist) {
      const pct = Math.round((checklist.done / checklist.total) * 100);
      m.prog.hidden = false;
      m.prog.title = t('progTitle', checklist.done, checklist.total, pct);
      m.prog.setAttribute('data-done', checklist.done === checklist.total ? '1' : '0');
      m.progFill.style.width = pct + '%';
    } else {
      m.prog.hidden = true;
    }
  }

  // --- the hints tab ---------------------------------------------------------------------------
  // Write the prompt in Gemini's message box as usual. Each row says what a good
  // prompt tends to contain, by Google's guidance, and turns green when the
  // draft has it. A missing row shows why it helps; a click puts an example
  // into the box. The ticks are guesses from your words, not a verdict.

  function placeCaretAtEnd(node) {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function insertPrompt(text) {
    const c = D.composer();
    if (c && c.tagName === 'TEXTAREA') {
      c.value = c.value.trim() ? c.value.replace(/\s*$/, '\n\n') + text : text;
      c.dispatchEvent(new Event('input', { bubbles: true }));
      c.focus();
      return t('inserted');
    }
    if (c) {
      c.focus();
      placeCaretAtEnd(c);
      const before = (c.innerText || '').trim() ? '\n\n' : '';
      let ok = false;
      try { ok = document.execCommand('insertText', false, before + text); } catch { ok = false; }
      if (ok) return t('inserted');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
      return t('copied');
    }
    return t('noBox');
  }

  const shownPatterns = () => P.patterns.filter(p => (I18N[lang].patterns || {})[p.id]);

  function link(href, text) {
    return el('a', { href, text, target: '_blank', rel: 'noopener noreferrer' });
  }

  function renderHints(body) {
    if (!hintRows) {
      body.textContent = '';
      body.appendChild(el('p', { class: 'gtr-lead', text: t('lead') }));
      body.appendChild(el('div', { class: 'gtr-words' }));
      const checks = el('div', { class: 'gtr-checks' });
      hintRows = new Map();
      for (const p of shownPatterns()) {
        const [label, hint, example] = I18N[lang].patterns[p.id];
        const r = el('button', {
          class: 'gtr-check', type: 'button', 'data-id': p.id,
          onclick: () => { if (!r.classList.contains('gtr-ok')) flashDone(r, insertPrompt(example)); },
        }, [
          el('span', { class: 'gtr-tick', text: '○' }),
          el('span', { class: 'gtr-check-text' }, [
            el('span', { class: 'gtr-check-label', text: label }),
            el('span', { class: 'gtr-check-hint', text: hint }),
          ]),
        ]);
        hintRows.set(p.id, r);
        checks.appendChild(r);
      }
      body.appendChild(checks);
      body.appendChild(el('p', { class: 'gtr-note', text: t('note') }));

      const starters = el('div', { class: 'gtr-starters' }, [
        el('h4', { text: t('startersH') }),
        el('p', { class: 'gtr-note', text: t('startersNote') }),
      ]);
      for (const id of P.starters) {
        const s = (I18N[lang].starters || {})[id];
        if (!s) continue;
        starters.appendChild(el('button', {
          class: 'gtr-starter', type: 'button', title: s[1], 'data-id': id,
          onclick: ev => flashDone(ev.currentTarget, insertPrompt(s[1])),
        }, [el('span', { text: s[0] })]));
      }
      body.appendChild(starters);

      const pr = el('details', { class: 'gtr-principles' }, [el('summary', { text: t('principlesH') })]);
      for (const [head, d] of I18N[lang].principles || []) {
        pr.appendChild(el('div', { class: 'gtr-principle' }, [el('b', { text: head }), el('span', { text: ' ' + d })]));
      }
      pr.appendChild(el('p', { class: 'gtr-sources' }, [
        el('span', { text: t('sourcesH') + ' ' }),
        link(L.sources.prompting, t('src_prompting')), el('span', { text: ' · ' }),
        link(L.sources.longContext, t('src_longContext')), el('span', { text: ' · ' }),
        link(L.sources.workspaceGuide, t('src_workspace')),
      ]));
      body.appendChild(pr);
    }

    const raw = D.draftText();
    const draft = P.normalize(raw);
    const ctx = { attachments: D.composerAttachments(), words: E.words(raw), chars: E.collapse(raw).length };
    const words = body.querySelector('.gtr-words');
    words.textContent = ctx.words
      ? t('words', ctx.words, fmt(E.tokensOfText(raw)), L.prompt.goodWords)
      : t('wordsNone', L.prompt.goodWords);
    for (const p of shownPatterns()) {
      const row = hintRows.get(p.id);
      let s = false;
      try { s = draft.trim() ? p.test(draft, ctx) : false; } catch { s = false; }
      const state = s === null ? 'na' : s ? 'ok' : 'miss';
      row.classList.toggle('gtr-ok', state === 'ok');
      row.classList.toggle('gtr-na', state === 'na');
      row.setAttribute('data-state', state);
      row.querySelector('.gtr-tick').textContent = state === 'ok' ? '●' : state === 'na' ? '–' : '○';
      row.title = state === 'ok' ? '' : state === 'na' ? t('naTitle') : t('checkTitle');
    }
  }

  // --- the context tab ---------------------------------------------------------------------------

  const HEALTH = ['transcript', 'userTurn', 'modelTurn', 'composer', 'uploadChip', 'canvasChip', 'codeBlock', 'generatedImage'];

  function line(label, value, opts = {}) {
    return el('div', { class: 'gtr-line' + (opts.strong ? ' gtr-strong' : ''), ...(opts.onclick ? { role: 'button', tabindex: '0', onclick: opts.onclick } : {}) }, [
      el('span', { class: 'gtr-line-label', text: label }),
      el('span', { class: 'gtr-line-value', text: value }),
    ]);
  }

  function renderContext(body) {
    const p = E.plan(planId);
    const draftTok = E.tokensOfText(D.draftText());
    const u = E.usage(stats.total, p.tokens);
    const sig = JSON.stringify([lang, planId, stats, draftTok, health, biggest && [biggest.turn, biggest.tokens]]);
    if (sig === ctxSig) return;
    ctxSig = sig;
    body.textContent = '';

    // Which plan: the page cannot tell, so the reader says.
    body.appendChild(el('h4', { text: t('planH') }));
    body.appendChild(el('div', { class: 'gtr-plans', role: 'radiogroup', 'aria-label': t('planH') }, L.plans.map(pl => el('button', {
      class: 'gtr-plan' + (pl.id === planId ? ' gtr-on' : ''), type: 'button', role: 'radio', 'aria-checked': String(pl.id === planId), 'data-plan': pl.id,
      onclick: () => { planId = pl.id; save('plan', pl.id); paint(); },
    }, [el('span', { class: 'gtr-plan-name', text: t('plan_' + pl.id) }), el('span', { class: 'gtr-plan-tok', text: fmt(pl.tokens) })]))));
    body.appendChild(el('p', { class: 'gtr-note', text: t('planNote') }));

    // How full it is.
    body.appendChild(el('div', { class: 'gtr-big' }, [
      el('span', { class: 'gtr-big-num', 'data-tone': u.tone, text: '≈ ' + fmt(stats.total) }),
      el('span', { class: 'gtr-big-of', text: t('usageOf', fmt(p.tokens), E.fmtPct(u.pct)) }),
    ]));
    body.appendChild(el('div', { class: 'gtr-bar' }, [el('span', { class: 'gtr-bar-fill', 'data-tone': u.tone, style: { width: Math.min(100, u.pct) + '%' } })]));
    if (u.tone !== 'success') {
      const tip = u.ratio >= 1 ? t('tipOver') : u.tone === 'danger' ? t('tipDanger') : t('tipWarn');
      body.appendChild(el('p', { class: 'gtr-tip', 'data-tone': u.tone, text: tip }));
    }

    // What went into it.
    body.appendChild(el('h4', { text: t('breakdownH') }));
    const rows = el('div', { class: 'gtr-lines' });
    rows.appendChild(line(t('ctxYou', stats.nUser), '≈ ' + fmt(stats.user)));
    rows.appendChild(line(t('ctxGemini', stats.nModel), '≈ ' + fmt(stats.model)));
    if (stats.nImages) rows.appendChild(line(t('ctxImages', stats.nImages), '≥ ' + fmt(stats.images)));
    if (stats.otherFiles) rows.appendChild(line(t('ctxFiles', stats.otherFiles), t('notCounted')));
    rows.appendChild(line(t('ctxTotal'), '≈ ' + fmt(stats.total), { strong: true }));
    if (draftTok) rows.appendChild(line(t('ctxDraft'), '+ ' + fmt(draftTok)));
    body.appendChild(rows);
    if (stats.text) {
      const [lo, hi] = E.wordsRange(stats.text);
      body.appendChild(el('p', { class: 'gtr-note', text: t('ctxWords', fmt(lo), fmt(hi)) }));
    }
    if (biggest && stats.nModel > 1) {
      body.appendChild(el('div', { class: 'gtr-lines' }, [line(t('ctxBiggest', biggest.turn + 1), '≈ ' + fmt(biggest.tokens), {
        onclick: () => { if (biggest && biggest.el && biggest.el.isConnected) showOnPage(biggest.el); },
      })]));
    }
    body.appendChild(el('ul', { class: 'gtr-notes' }, (t('ctxNotes') || []).map(s => el('li', { text: s }))));

    // Which selectors matched: the first place to look when Google changes the page.
    const hp = el('details', { class: 'gtr-health', open: health.user || health.model ? null : '' }, [
      el('summary', { text: t('healthH', health.user, health.model) }),
      el('p', { class: 'gtr-note', text: t('healthNote') }),
    ]);
    for (const k of HEALTH) {
      const s = health.seen[k];
      hp.appendChild(el('div', { class: 'gtr-hrow', 'data-ok': s ? '1' : '0', 'data-concept': k, title: s ? s.selector : '' }, [
        el('span', { class: 'gtr-hmark', text: s ? '✓' : '–' }),
        el('span', { class: 'gtr-hname', text: t('h_' + k) }),
        el('code', { class: 'gtr-hsel', text: s ? s.selector : t('notSeen') }),
      ]));
    }
    body.appendChild(hp);

    // Where the numbers come from.
    const ref = el('details', { class: 'gtr-ref' }, [
      el('summary', { text: t('refH') }),
      el('p', { text: t('refPlans') }),
      el('p', { text: t('refApi', fmt(L.api.inputTokens), fmt(L.api.outputTokens)) }),
      el('p', { text: t('refRatio') }),
      el('p', { class: 'gtr-sources' }, [
        el('span', { text: t('refChecked', L.checked) + ' ' }),
        link(L.sources.plans, t('src_plans')), el('span', { text: ' · ' }),
        link(L.sources.tokens, t('src_tokens')),
      ]),
    ]);
    body.appendChild(ref);
  }

  // --- painting ---------------------------------------------------------------------------------

  let painting = 0;
  function paint() {
    if (painting) return;
    // A timer, not requestAnimationFrame: a background tab never gets a frame,
    // and the panel has to be right the moment the tab comes forward.
    painting = setTimeout(() => {
      painting = 0;
      try { paintNow(); } catch (err) { console.warn('[GemTrin]', err); }
    }, 60);
  }

  // A Canvas opens beside the chat, where the panel floats; the panel steps
  // aside while it is open and comes back when it closes, unless the reader
  // opened or closed it themselves in between.
  let canvasWasOpen = false;
  function watchCanvas() {
    const open = D.canvasOpen();
    if (open && !canvasWasOpen && !collapsed && !narrow()) { collapsed = true; autoHidden = true; }
    else if (!open && canvasWasOpen && autoHidden) { collapsed = false; autoHidden = false; }
    canvasWasOpen = open;
  }

  function paintNow() {
    const signed = D.signedIn();
    if (!ui && !signed) return;
    if (!ui) ui = build();
    if (!ui.rootEl.isConnected) document.body.appendChild(ui.rootEl);
    if (!signed) { ui.rootEl.style.display = 'none'; return; }
    ui.rootEl.style.display = '';

    const light = isLight();
    for (const [k, v] of Object.entries(PALETTE[light ? 'light' : 'dark'])) ui.rootEl.style.setProperty('--gtr-' + k, v);
    ui.rootEl.style.setProperty('--gtr-w', width + 'px');
    ui.rootEl.setAttribute('data-theme', light ? 'light' : 'dark');
    ui.rootEl.setAttribute('lang', lang);

    watchCanvas();
    renderMeter();
    ui.rootEl.setAttribute('data-collapsed', collapsed ? '1' : '0');
    if (collapsed) return;

    for (const b of ui.tabs.querySelectorAll('.gtr-tabbtn')) {
      const which = b.getAttribute('data-tab');
      b.classList.toggle('gtr-on', which === tab);
      b.setAttribute('aria-selected', String(which === tab));
      b.textContent = t('tab_' + which);
    }
    ui.grip.title = t('grip');
    ui.panel.setAttribute('aria-label', 'GemTrin');
    const pick = ui.tabs.querySelector('.gtr-lang');
    if (pick) {
      pick.title = t('lang');
      pick.setAttribute('aria-label', t('lang'));
      if (pick.value !== lang) pick.value = lang;
    }
    if (tab !== ui.body.getAttribute('data-tab')) {
      resetBody();
      ui.body.setAttribute('data-tab', tab);
    }
    if (tab === 'files') renderFiles(ui.body);
    else if (tab === 'hints') renderHints(ui.body);
    else renderContext(ui.body);
  }

  // --- watching the page ---------------------------------------------------------------------------

  function reset() {
    items.clear();
    meta.clear();
    seenTs.clear();
    dirtyAll = true;
    checklist = null;
    checklistAt = 0;
    openedAt = Date.now();
    historyUntil = openedAt + 3000;
    lastTurnCount = 0;
    resetBody();
    try { collect(); } catch (err) { console.warn('[GemTrin]', err); }
    paint();
  }

  // Gemini swaps conversations without reloading. Going from /app to
  // /app/<id> is the same new chat getting its address, not a new conversation.
  function onRoute() {
    const p = location.pathname;
    if (p === convoKey) return;
    const continued = p.startsWith(convoKey.replace(/\/$/, '') + '/');
    convoKey = p;
    if (!continued) reset();
  }

  let turnSel = null;
  const observer = new MutationObserver(records => {
    try {
      let transcript = false;
      let typing = false;
      onRoute(); // a new address usually arrives with the new conversation's first changes
      turnSel ??= D.turnSelector();
      for (const rec of records) {
        const tgt = rec.target.nodeType === 1 ? rec.target : rec.target.parentElement;
        if (!tgt || tgt.closest('#gtr-root')) continue;
        if (composerEl && composerEl.contains(tgt)) { typing = true; continue; }
        transcript = true;
        if (turnSel) {
          const turn = tgt.closest(turnSel);
          if (turn) dirty.add(turn);
        }
      }
      if (transcript) scheduleCollect();
      else if (typing && !collapsed && tab !== 'files') paint();
    } catch (err) { console.warn('[GemTrin]', err); }
  });

  function start() {
    openedAt = Date.now();
    historyUntil = openedAt + 3000;
    try { collect(); } catch (err) { console.warn('[GemTrin]', err); }
    paint();
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    // Fades the "recent" marks, follows route changes, notices a Canvas closing.
    setInterval(() => { onRoute(); paint(); }, 1000);
    window.addEventListener('popstate', onRoute);
    // A full re-read now and then catches anything the observer missed.
    setInterval(scheduleCollect, 15000);
    // The hints tick while you type, also in a plain textarea.
    document.addEventListener('input', e => {
      if (e.target && e.target.closest && e.target.closest('#gtr-root')) return;
      if (!collapsed && tab !== 'files') paint();
    }, true);
  }

  // For test/harness.html. In the extension this lives in the content script's
  // own world, which the page cannot see.
  globalThis.__gtrDebug = {
    get items() { return [...items.values()].map(({ el: _el, ...rest }) => rest); },
    get stats() { return { ...stats }; },
    get health() { return health; },
    get state() { return { collapsed, tab, planId, lang, snippets, follow }; },
    meta: key => meta.get(key),
    collect: () => { collect(); paint(); },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
