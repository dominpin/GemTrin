// The arithmetic behind the context meter. No DOM here: everything takes plain
// numbers and strings, so test/unit.html can check it on its own.
//
// All of it is an estimate. The page never shows the real token count, so text
// is counted at Google's rule of thumb (4 characters per token) and images by
// Google's tile rule; anything the page does not show is not counted.
globalThis.GTR_EST = (() => {
  'use strict';
  const L = globalThis.GTR_LIMITS;

  const collapse = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

  // Tokens for a number of characters of text.
  const textTokens = chars => (chars > 0 ? Math.ceil(chars / L.text.charsPerToken) : 0);

  const tokensOfText = s => textTokens(collapse(s).length);

  const words = s => {
    const c = collapse(s);
    return c ? c.split(' ').length : 0;
  };

  // The range of English words a number of tokens stands for (60-80 per 100).
  const wordsRange = tokens => L.text.wordsPer100Tokens.map(w => Math.round((tokens * w) / 100));

  // Tokens for one image. Without its size, the smallest cost (one tile) is
  // the honest answer, and `known` says it is a lower bound.
  function imageTokens(w, h) {
    const m = L.media;
    if (!(w > 0 && h > 0)) return { tokens: m.tokensPerTile, known: false };
    if (w <= m.smallImageMaxPx && h <= m.smallImageMaxPx) return { tokens: m.tokensPerTile, known: true };
    return { tokens: Math.ceil(w / m.tilePx) * Math.ceil(h / m.tilePx) * m.tokensPerTile, known: true };
  }

  function plan(id) {
    return L.plans.find(p => p.id === id) || L.plans.find(p => p.id === L.defaultPlan) || L.plans[0];
  }

  // How full the window is, and the tone to show it in.
  function usage(tokens, limit) {
    const ratio = limit > 0 ? Math.max(0, tokens) / limit : 0;
    const tone = ratio >= L.thresholds.danger ? 'danger' : ratio >= L.thresholds.warn ? 'warning' : 'success';
    return { ratio, pct: ratio * 100, tone };
  }

  function fmtPct(pct) {
    if (pct > 0 && pct < 1) return '<1%';
    return Math.round(pct) + '%';
  }

  // 950, 18.2k, 128k, 1M, 1.05M. `dec` is the decimal mark of the language.
  function fmtTokens(n, dec = '.') {
    n = Math.max(0, Math.round(n || 0));
    const trim = (x, digits) => x.toFixed(digits).replace(/\.?0+$/, '').replace('.', dec);
    if (n < 1000) return String(n);
    if (n < 100000) return trim(n / 1000, 1) + 'k';
    if (Math.round(n / 1000) < 1000) return Math.round(n / 1000) + 'k';
    return trim(n / 1e6, 2) + 'M';
  }

  // The totals the panel shows. `images` is a list of imageTokens() results.
  function summarize(p = {}) {
    const userChars = p.userChars || 0;
    const modelChars = p.modelChars || 0;
    const user = textTokens(userChars);
    const model = textTokens(modelChars);
    const imgs = p.images || [];
    const images = imgs.reduce((s, x) => s + (x.tokens || 0), 0);
    return {
      user,
      model,
      text: user + model,
      images,
      nImages: imgs.length,
      otherFiles: p.otherFiles || 0,
      nUser: p.nUser || 0,
      nModel: p.nModel || 0,
      chars: userChars + modelChars,
      total: user + model + images,
    };
  }

  return { collapse, textTokens, tokensOfText, words, wordsRange, imageTokens, plan, usage, fmtPct, fmtTokens, summarize };
})();
