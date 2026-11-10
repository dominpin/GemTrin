// The Hints tab, minus its words. The material comes from Google's own pages:
//   - Gemini API "Prompt design strategies", including its Gemini 3 section
//     (be precise and direct, one delimiter style, context first and the
//     question last, few-shot examples, ask for detail explicitly),
//   - Gemini API "Long context" (put the query at the end),
//   - Gemini for Workspace "Prompting guide 101" (persona, task, context, format).
// The labels, hints and examples shown to the reader are in i18n/<lang>.js, one
// set per language, keyed by the ids below.
//
// Each test reads the draft after diacritics are stripped (so "jesteś" and
// "jestes" count alike) and returns true (present), false (missing) or null
// (does not apply to this draft). They are word heuristics, never a grade.
globalThis.GTR_DOCS = (() => {
  'use strict';
  const L = globalThis.GTR_LIMITS;

  const VERB_EN = 'write|draft|create|make|build|generate|summari[sz]e|explain|compare|list|translate|rewrite|rephrase|edit|proofread|review|analy[sz]e|plan|design|suggest|outline|describe|calculate|find|fix|debug|prepare|give|help|classify|extract|convert|brainstorm|research|recommend|propose|evaluate|answer|tell|show|identify|organi[sz]e|check|improve|shorten|expand|simplify|teach|quiz|draw|sort|rank|estimate|name';
  const VERB_PL = 'napisz|stworz|utworz|zrob|zbuduj|wygeneruj|podsumuj|streszcz|stresc|wyjasnij|objasnij|wytlumacz|porownaj|wypisz|wymien|przetlumacz|przepisz|przeredaguj|zredaguj|popraw|sprawdz|przeanalizuj|zaplanuj|zaprojektuj|zaproponuj|zasugeruj|opisz|oblicz|policz|znajdz|napraw|przygotuj|daj|podaj|pomoz|sklasyfikuj|wyodrebnij|przekonwertuj|zamien|zbadaj|polec|ocen|odpowiedz|powiedz|pokaz|wskaz|uporzadkuj|skroc|rozwin|uprosc|naucz|narysuj|posortuj|uszereguj|oszacuj|nazwij';
  const VERB_ANY = new RegExp(`(^|[\\s.,;:!?(\\[{"'])(${VERB_EN}|${VERB_PL})\\b`, 'i');
  const VERB_START = new RegExp(`^\\s*(${VERB_EN}|${VERB_PL})\\b`, 'i');

  const ROLES_EN = 'expert|specialist|senior|junior|professional|teacher|tutor|coach|editor|writer|copywriter|developer|programmer|engineer|analyst|consultant|lawyer|doctor|marketer|manager|recruiter|designer|reviewer|researcher|scientist|journalist|translator|assistant|mentor|historian|economist|strategist|critic';
  const ROLES_PL = 'ekspert|specjalist|nauczyciel|korepetytor|trener|redaktor|pisarz|copywriter|programist|inzynier|analityk|doradc|konsultant|prawnik|lekarz|marketingow|menedzer|kierownik|rekruter|projektant|recenzent|badacz|naukowiec|dziennikarz|tlumacz|asystent|mentor|historyk|ekonomist|strateg|krytyk|doswiadczon';

  const persona = new RegExp(
    `\\b(you are|you're|act as|acting as|take (on )?the role|play the role|imagine you are|pretend (you are|to be)|as an? (${ROLES_EN})` +
    `|jestes|wciel sie|zachowuj sie jak|wystepuj jako|wystap jako|odegraj role|badz (${ROLES_PL})\\w*|jako (${ROLES_PL})\\w*)\\b`, 'i');

  const context = /\b(because|since|so that|in order to|background|context|audience|my goal|our goal|the goal is|i('| a)m working on|we('| a)re working on|i need (this|it) for|target (group|audience)|(for|to) (my|our|the|a) (team|class|students|client|clients|boss|manager|board|audience|readers|customers|users|blog|presentation|meeting|report|project|course|exam|newsletter|website|company|kids|parents)|poniewaz|bo|zeby|aby|kontekst\w*|tlo|odbiorc\w*|grupa docelowa|moim celem|naszym celem|celem jest|pracuje nad|pracujemy nad|potrzebuje (tego|go|jej) (do|na)|dla (mojego|mojej|moich|naszego|naszej|naszych|klienta|klientow|zespolu|szefa|zarzadu|uczniow|studentow|czytelnikow|odbiorcow|dzieci|rodzicow))\b|@\w/i;

  const format = /\b(table|bullet(s| points?)?|list|numbered|json|csv|markdown|headings?|sections?|outline|paragraphs?|sentences?|one-pager|email|e-mail|slides?|step[- ]by[- ]step|format(ted)?|tabel\w*|punkt\w*|list\w*|wypunktow\w*|numerowan\w*|naglowk\w*|sekcj\w*|akapit\w*|zdani\w*|format\w*|mail\w*|slajd\w*|krok po kroku)\b/i;

  const constraints = /\b(do not|don'?t|never|avoid|only|at most|no more than|maximum|max\.?|must not|limit (it|to)|keep it (under|below|short|brief)|under \d+ (words|characters|sentences)|nie (uzywaj|dodawaj|pisz|zmieniaj|wspominaj|wymyslaj|zgaduj|przekraczaj)|unikaj|tylko|wylacznie|maksymalnie|najwyzej|nie wiecej niz|ponizej \d+|w \d+ (slowach|zdaniach|znakach))\b/i;

  const examples = /(\bfor example\b|\bfor instance\b|\be\.g\.|<example|\bexamples?:|\binput:|\boutput:|\blike this:|\bna przyklad\b|\bnp\.|\bprzyklad\w*:|\bwejscie:|\bwyjscie:|\btak jak tutaj:)/i;

  const anchor = /\?|\b(based on|given|using|from) (the |this |all |that )?(information|text|document|documents|data|context|material|content|article|transcript) above\b|\babove\b|\bna podstawie\b|\bw oparciu o\b|\bbiorac pod uwage\b|\bpowyzsz\w*/i;

  const depth = /\b(in detail|detailed|thorough(ly)?|in[- ]depth|comprehensive|step[- ]by[- ]step|elaborate|conversational|friendly|formal|casual|tone|briefly|brief|concise(ly)?|short|in (one|two|three|four|five|\d+) (sentences?|paragraphs?)|szczegolow\w*|dokladn\w*|wyczerpujac\w*|obszern\w*|krok po kroku|zwiez\w*|krotk\w*|w (jednym|dwoch|trzech|czterech|pieciu|\d+) (zdani\w*|akapit\w*)|ton\w*|przystepn\w*|swobodn\w*|formaln\w*)\b/i;

  return {
    patterns: [
      // Persona: the first part of the Workspace guide.
      { id: 'persona', test: t => persona.test(t) },
      // Task: "be precise and direct" (Gemini 3). Long enough to be a request,
      // and either an instruction verb or a question.
      { id: 'task', test: (t, c) => c.words >= 6 && (VERB_ANY.test(t) || t.includes('?')) },
      // Context: who it is for and why, or a file attached to the draft.
      { id: 'context', test: (t, c) => c.attachments > 0 || context.test(t) },
      // Format: the shape of the answer.
      { id: 'format', test: t => format.test(t) },
      // Constraints: what to do and not to do (Prompt design strategies).
      { id: 'constraints', test: t => constraints.test(t) },
      // Few-shot examples: "We recommend to always include few-shot examples".
      { id: 'examples', test: t => examples.test(t) },
      // One consistent delimiter style: XML tags or Markdown headings, not both.
      {
        id: 'delimiters',
        test: t => {
          const xml = /<([a-z][\w-]{0,30})>[\s\S]*?<\/\1>/i.test(t);
          const md = /^\s{0,3}#{1,4}\s+\S/m.test(t);
          if (xml && md) return false;
          return xml || md || /```|"""/.test(t);
        },
      },
      // Long context: the material first, the question last (Long context FAQ,
      // Gemini 3 section). Only a long draft is judged.
      {
        id: 'questionLast',
        test: (t, c) => {
          if (c.chars < L.prompt.longChars) return null;
          const paras = t.trim().split(/\n\s*\n/);
          const last = paras[paras.length - 1];
          return anchor.test(last.slice(-400)) || VERB_START.test(last);
        },
      },
      // Gemini 3 is direct by default: ask for detail or a tone if you want it.
      { id: 'depth', test: t => depth.test(t) },
    ],

    // Ready-made prompts, in this order. Their label and text are in i18n, so
    // a prompt goes into the box in the reader's language.
    starters: ['summarizePdf', 'compareDocs', 'researchBrief', 'canvasDraft', 'explainCode', 'rewriteEmail', 'longDoc'],

    // Strips diacritics so the tests above can be written in plain ASCII.
    normalize: s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L'),
  };
})();
