// Kaszëbsczi: a first pass that wants a native speaker's review. It builds on the
// Polish texts: what has no natural Kashubian wording (long prompts, the
// explanatory notes, Gemini's own terms) falls back to the Polish string.
(() => {
  const pl = GTR_I18N.pl;
  const plural = (n, one, few, many) =>
    n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;
  const PP = pl.patterns;

  GTR_I18N.csb = {
    ...pl,
    tab_files: 'Plikù', tab_hints: 'Wskôzë', tab_context: 'Kòntekst',
    lang: 'Jãzëk', grip: 'Pòcyg, abë zmienic szérzã', open: 'Òtemkni GemTrin', close: 'Zwij panel',

    meterTitle: 'Szacënk z tekstu widzonégò na starnie (kòl 4 znaczi na token) wobec òkna kòntekstu Twòjégò planu. Klikni, abë zdrzec detale.',
    plan_free: 'Bez planu',

    follow: 'jidzë za', followTitle: 'Przewijôj drzewkò do tegò, co Gemini òstatno dodôł abò zmienił',
    snippets: n => `felmë ${n}`, snippetsTitle: 'Pokazëjë téż blokù kòdu, jaczé nie nazéwają pliku',
    count: n => `${n} ${plural(n, 'element', 'elementë', 'elementów')}`,
    grp_uploads: 'Dołączoné', grp_code: 'Kòd', grp_images: 'Òbrôzë',
    fold: 'Zwij', unfold: 'Rozwij',
    kind_upload: 'dołączoné przez Cebie', kind_write: 'zrobioné przez Gemini', kind_edit: 'pózni zmienioné',
    kind_image: 'òbrôz w ùdpòwiésce', kind_snippet: 'blok kòdu bez miona pliku',
    turnN: n => `tura ${n}`,
    openCanvas: 'Klikni, abë òtemknąc', scrollTo: 'Klikni, abë do niegò przewinąc',
    imageN: n => `òbrôz ${n}`, unnamedFile: 'plik', untitledCanvas: 'Dokùment bez titla',

    lead: 'Pisz prompt w pòlu wiadłów Gemini. Tuwò widzec, czegò mù jeszcze felëje wedle wskôzów Google.',
    words: (n, tok, good) => `${n} ${plural(n, 'slowò', 'slowa', 'słów')} · ≈ ${tok} tok · Google: ùdóné promptë mają przeciãtno ~${good} słów`,
    wordsNone: good => `Prôżny szkic · Google: ùdóné promptë mają przeciãtno ~${good} słów`,
    checkTitle: 'Klikni, abë wstawic przëmiôr do pòla',
    naTitle: 'Tikô sã leno dłudżich promptów',
    startersH: 'Gòtowé promptë', startersNote: 'Klikni, a trafi do pòla wiadłów; ùzupełni [nawiasë].',
    principlesH: 'Prawidła z dokùmentacëji Google',
    sourcesH: 'Zdrój:',
    inserted: 'wstawioné', copied: 'skòpiowané', noBox: 'nie nalazłé pòla wiadłów',
    patterns: {
      persona: ['Dôj Gemini rolã', 'Persona je pierwszô z štërzech dzélów przewòdnika Google: jedno zdanié ò tim, chto òdpòwiôdô, ùstôwiô tón i pòzym detalów.', PP.persona[2]],
      task: ['Rzeknij prosto, co ma zrobic', 'Rada Google dlô Gemini 3: pisz dokładno i prosto. Zaczni òd czasownika i nazwij, czegò chcesz.', PP.task[2]],
      context: ['Dodôj kòntekst', 'Napisz, dlô kògò to je i pò co, abò dołączë plik. Bez kòntekstu Gemini òdpòwiôdô òglëno.', PP.context[2]],
      format: ['Òkreslë fòrmã ùdpòwiésce', 'Tabela, pùnktë, JSON, lëczba akapitów: nazwij fòrmat, a ùdpòwiésc òd razu sã przëdô.', PP.format[2]],
      constraints: ['Postôw grańcë', 'Napisz, czegò ùnikac i jak dłudżô mòże bëc ùdpòwiésc. Wëraznô òbmezënk to dzél zalécënków Google.', PP.constraints[2]],
      examples: ['Pòkażë przëmiôr', 'Google zalécô, abë wiedno dôwac przëmiarë (few-shot): rozmajité, ale wszëtczé w jednym, spòjnym fòrmace.', PP.examples[2]],
      delimiters: ['Rozdzél dzélë promptu', 'Zamkni pòlecenié, kòntekst i dóné w znaczniczi XML abò nagłowczi Markdown. Wëbierzë jeden stil i jich nie miész.', PP.delimiters[2]],
      questionLast: ['Pëtanié na kùńcu', 'Przë dłudżich promptach Google radzy: nôprzód całi kòntekst, na kùńcu pëtanié, zaczinającë òd „Na podstawie powyższych informacji…”.', PP.questionLast[2]],
      depth: ['Rzeknij, jak dokładno', 'Gemini 3 domëslno òdpòwiôdô krótkò. Prosz ò detale, kroczi abò kònkretny tón, eżlë jich potrzebùjesz.', PP.depth[2]],
    },

    planH: 'Twój plan',
    ctxYou: n => `Twòje wiadłë (${n})`,
    ctxGemini: n => `Ùdpòwiésce Gemini (${n})`,
    ctxImages: n => `Òbrôzë (${n})`,
    ctxFiles: n => `Jinszé plikù (${n})`,
    notCounted: 'niezliczoné', ctxTotal: 'Razem', ctxDraft: 'Szkic w pòlu',
    ctxBiggest: n => `Nôdłudżô ùdpòwiésc (tura ${n})`,
    healthH: (u, m) => `Kòntrola starnë · nalazłé ${u} + ${m} tur`,
    h_transcript: 'Rozmòwa', h_userTurn: 'Twòje wiadłë', h_modelTurn: 'Ùdpòwiésce Gemini', h_composer: 'Pòle wiadłów',
    h_uploadChip: 'Dołączoné plikù', h_canvasChip: 'Kafelczi Canvas', h_codeBlock: 'Blokù kòdu', h_generatedImage: 'Òbrôzë',
    notSeen: 'felëje na starnie',
    refH: 'Skądka te lëczbë',
  };
  GTR_LANG_NAMES.csb = 'Kaszëbsczi';
})();
