// Ślōnski: a first pass that wants a native speaker's review. It builds on the
// Polish texts: what has no natural Silesian wording (long prompts, the
// explanatory notes, Gemini's own terms) falls back to the Polish string.
(() => {
  const pl = GTR_I18N.pl;
  const plural = (n, one, few, many) =>
    n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;
  const PP = pl.patterns;

  GTR_I18N.szl = {
    ...pl,
    tab_files: 'Pliki', tab_hints: 'Wskazōwki', tab_context: 'Kōntekst',
    lang: 'Godka', grip: 'Ciōng, coby zmiynić szyrokość', open: 'Ôtwōrz GemTrin', close: 'Zwiń panel',

    meterTitle: 'Szacunek liczōny z tekstu widocznego na zajtce (kole 4 znaki na token) przociwko ôknu kōntekstu Twojigo planu. Kliknij, coby zocyć szczegōły.',
    plan_free: 'Bez planu',

    follow: 'idź za', followTitle: 'Przewijej drzewko do tego, co Gemini ôstatnio dodoł abo zmiynioł',
    snippets: n => `fragmynty ${n}`, snippetsTitle: 'Pokazuj tyż bloki kodu, kere niy nazywajōm pliku',
    count: n => `${n} ${plural(n, 'element', 'elementy', 'elementōw')}`,
    grp_uploads: 'Dołōnczōne', grp_code: 'Kod', grp_images: 'Ôbrazy',
    fold: 'Zwiń', unfold: 'Rozwiń',
    kind_upload: 'dołōnczōny przez Ciebie', kind_write: 'zrobiōny przez Gemini', kind_edit: 'potym zmiyniōny',
    kind_image: 'ôbraz w ôdpowiydzi', kind_snippet: 'blok kodu bez miana pliku',
    turnN: n => `tura ${n}`,
    openCanvas: 'Kliknij, coby ôtwōrzić', scrollTo: 'Kliknij, coby do niego przewinōć',
    imageN: n => `ôbraz ${n}`, unnamedFile: 'plik', untitledCanvas: 'Dokumynt bez titla',

    lead: 'Piszoj prompt w polu wiadōmości Gemini. Tukej widać, czego mu jeszcze brakuje podle wskazōwek Google.',
    words: (n, tok, good) => `${n} ${plural(n, 'słowo', 'słowa', 'słōw')} · ≈ ${tok} tok · Google: udane prompty majōm przeciyntnie ~${good} słōw`,
    wordsNone: good => `Prōzny szkic · Google: udane prompty majōm przeciyntnie ~${good} słōw`,
    checkTitle: 'Kliknij, coby wstawić przikłod do pola',
    naTitle: 'Tycy sie yno dugich promptōw',
    startersH: 'Gotowe prompty', startersNote: 'Kliknij, a trefi do pola wiadōmości; uzupełnij [nawiasy].',
    principlesH: 'Zasady z dokumyntacyji Google',
    sourcesH: 'Zdrzōdła:',
    inserted: 'wstawiōne', copied: 'skopiowane', noBox: 'niy znaleziōno pola wiadōmości',
    patterns: {
      persona: ['Dej Gemini rolã', 'Persona to pierwsza ze sztyrech czyńści przewodnika Google: jedno zdanie ô tym, kery ôdpowiado, ustawio ton i poziōm szczegōłōw.', PP.persona[2]],
      task: ['Pedz prosto, co ma zrobić', 'Rada Google dlŏ Gemini 3: piszej dokładnie i prosto. Zacznij ôd czasownika i pōdej, czego chcesz.', PP.task[2]],
      context: ['Dodej kōntekst', 'Napisz, dlŏ kogo to je i po co, abo dołōncz plik. Bez kōntekstu Gemini ôdpowiado ôgōlnikowo.', PP.context[2]],
      format: ['Ôkryśl forma ôdpowiydzi', 'Tabela, punkty, JSON, liczba akapitōw: pōdej format, a ôdpowiydź ôd razu sie przido.', PP.format[2]],
      constraints: ['Postow granice', 'Napisz, czego ômijać i jak dugo mŏ być ôdpowiydź. Wyraźne ôgraniczynia to czynść zaleceń Google.', PP.constraints[2]],
      examples: ['Pokoż przikłod', 'Google radzi, coby zawsze dować przikłady (few-shot): rōżne, ale wszyskie w jednym, spōjnym formacie.', PP.examples[2]],
      delimiters: ['Rozdziel czyńści promptu', 'Ôbwiyż pōlecynie, kōntekst i dane w znaczniki XML abo nagłōwki Markdown. Weznij jedyn styl i ich niy mieszej.', PP.delimiters[2]],
      questionLast: ['Pytanie na kōńcu', 'Przi dugich promptach Google radzi: nojprzōd cały kōntekst, na kōńcu pytanie, zaczynajōnc ôd „Na podstawie powyższych informacji…”.', PP.questionLast[2]],
      depth: ['Pedz, jak dokładnie', 'Gemini 3 domyślnie ôdpowiado zwiyńźle. Proś ô szczegōły, kroki abo kōnkretny ton, jak ich potrzebujesz.', PP.depth[2]],
    },

    planH: 'Twōj plan',
    ctxYou: n => `Twoje wiadōmości (${n})`,
    ctxGemini: n => `Ôdpowiydzi Gemini (${n})`,
    ctxImages: n => `Ôbrazy (${n})`,
    ctxFiles: n => `Inksze pliki (${n})`,
    notCounted: 'niyliczōne', ctxTotal: 'Razym', ctxDraft: 'Szkic w polu',
    ctxBiggest: n => `Nojdugszo ôdpowiydź (tura ${n})`,
    healthH: (u, m) => `Kōntrola zajtki · znaleziōno ${u} + ${m} tur`,
    h_transcript: 'Rozmowa', h_userTurn: 'Twoje wiadōmości', h_modelTurn: 'Ôdpowiydzi Gemini', h_composer: 'Pole wiadōmości',
    h_uploadChip: 'Dołōnczōne pliki', h_canvasChip: 'Kafelki Canvas', h_codeBlock: 'Bloki kodu', h_generatedImage: 'Ôbrazy',
    notSeen: 'niy ma na zajtce',
    refH: 'Skąd te liczby',
  };
  GTR_LANG_NAMES.szl = 'Ślōnski';
})();
