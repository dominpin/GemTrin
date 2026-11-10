// The numbers GemTrin estimates with, each from a Google page (checked on the
// date below). When Google changes a limit, this is the only file to edit.
//
// What is confirmed and what is not:
//   plans              Gemini Apps Help Center, "Gemini Apps limits & upgrades":
//                      no plan 32k, AI Plus 128k, AI Pro and AI Ultra 1 million tokens.
//   text               Gemini API "Understand and count tokens": a token is about
//                      4 characters; 100 tokens are about 60-80 English words.
//   media              same page: an image up to 384 px on both sides is 258 tokens,
//                      a larger one is cut into 768x768 tiles of 258 tokens each;
//                      audio 32 tokens/s, video 263 tokens/s (static processing).
//                      How a partial tile is rounded is not stated; GemTrin rounds up.
//   api                same page: Gemini 3 and 2.5 models use separate input
//                      (1,048,576) and output (65,536) budgets. Shown for reference
//                      only: the Gemini app's window is the plan's, not the API's.
//   prompt.goodWords   Workspace "Prompting guide 101": the most successful prompts
//                      average about 21 words. Seen only in coverage of the guide,
//                      not on a Google page that loaded.
// Not confirmed anywhere, so not used: tokens per PDF page, the Deep Think window.
globalThis.GTR_LIMITS = {
  checked: '2026-11-10',

  text: {
    charsPerToken: 4,
    wordsPer100Tokens: [60, 80],
  },

  media: {
    smallImageMaxPx: 384,
    tilePx: 768,
    tokensPerTile: 258,
    audioTokensPerSecond: 32,
    videoTokensPerSecond: 263,
  },

  // The Gemini app's context window per Google AI plan. The page cannot tell
  // which plan the reader has, so the reader picks it on the Context tab.
  plans: [
    { id: 'free', tokens: 32000 },
    { id: 'plus', tokens: 128000 },
    { id: 'pro', tokens: 1000000 },
    { id: 'ultra', tokens: 1000000 },
  ],
  defaultPlan: 'free',

  api: {
    inputTokens: 1048576,
    outputTokens: 65536,
  },

  // Share of the window at which the meter turns yellow, then red.
  thresholds: { warn: 0.5, danger: 0.8 },

  prompt: {
    // From this many characters a draft counts as long, and "question last" applies.
    longChars: 1200,
    goodWords: 21,
  },

  sources: {
    plans: 'https://support.google.com/gemini/answer/16275805',
    tokens: 'https://ai.google.dev/gemini-api/docs/tokens',
    prompting: 'https://ai.google.dev/gemini-api/docs/prompting-strategies',
    longContext: 'https://ai.google.dev/gemini-api/docs/long-context',
    workspaceGuide: 'https://workspace.google.com/learning/content/gemini-prompt-guide',
  },
};
