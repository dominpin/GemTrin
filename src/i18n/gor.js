// Gôrolsko: a first pass that wants a native speaker's review. It builds on the
// Polish texts: what has no natural Goral wording (long prompts, the
// explanatory notes, Gemini's own terms) falls back to the Polish string.
(() => {
  const pl = GTR_I18N.pl;
  const plural = (n, one, few, many) =>
    n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;
  const PP = pl.patterns;

  GTR_I18N.gor = {
    ...pl,
    tab_files: 'Pliki', tab_hints: 'Wskazówki', tab_context: 'Kontekst',
    lang: 'Godka', grip: 'Przeciągnij, coby zmienić szerokość', open: 'Otwórz GemTrin', close: 'Zwiń panel',

    meterTitle: 'Szacunek z tekstu widocnego na stronie (kole 4 znaki na token) wobec okna kontekstu Twojego planu. Kliknij, coby obacyć szczegóły.',
    plan_free: 'Bez planu',

    follow: 'idź za', followTitle: 'Przewijoj drzewko do tego, co Gemini ostatnio dodoł abo zmienił',
    snippets: n => `fragmenty ${n}`, snippetsTitle: 'Pokozuj tyz bloki kodu, kie nie nazywajom pliku',
    count: n => `${n} ${plural(n, 'element', 'elementy', 'elementów')}`,
    grp_uploads: 'Dołączone', grp_code: 'Kod', grp_images: 'Obrazy',
    fold: 'Zwiń', unfold: 'Rozwiń',
    kind_upload: 'dołączony przez Ciebie', kind_write: 'zrobiony przez Gemini', kind_edit: 'potem zmieniony',
    kind_image: 'obraz w odpowiedzi', kind_snippet: 'blok kodu bez nazwy pliku',
    turnN: n => `tura ${n}`,
    openCanvas: 'Kliknij, coby otworzyć', scrollTo: 'Kliknij, coby do niego przewinąć',
    imageN: n => `obraz ${n}`, unnamedFile: 'plik', untitledCanvas: 'Dokument bez tytułu',

    lead: 'Piszoj prompt w polu wiadomości Gemini. Tu widać, cego mu jesce brakuje wedle wskazówek Google.',
    words: (n, tok, good) => `${n} ${plural(n, 'słowo', 'słowa', 'słów')} · ≈ ${tok} tok · Google: udane prompty majom średnio ~${good} słów`,
    wordsNone: good => `Pusty szkic · Google: udane prompty majom średnio ~${good} słów`,
    checkTitle: 'Kliknij, coby wstawić przykład do pola',
    naTitle: 'Dotyko ino długich promptów',
    startersH: 'Gotowe prompty', startersNote: 'Kliknij, a trafi do pola wiadomości; uzupełnij [nawiasy].',
    principlesH: 'Zasady z dokumentacji Google',
    sourcesH: 'Źródła:',
    inserted: 'wstawiono', copied: 'skopiowano', noBox: 'nie znaleziono pola wiadomości',
    patterns: {
      persona: ['Doj Gemini role', 'Persona to pierwsa ze cterech casci przewodnika Google: jedno zdanie o tym, kto odpowiado, ustawio ton i poziom szczegółów.', PP.persona[2]],
      task: ['Powiedz prosto, co ma zrobić', 'Rada Google dlo Gemini 3: piszoj dokładnie i prosto. Zacnij od casownika i powiedz, cego chces.', PP.task[2]],
      context: ['Dodoj kontekst', 'Napisz, dlo kogo to je i po co, abo dołącz plik. Bez kontekstu Gemini odpowiado ogólnikowo.', PP.context[2]],
      format: ['Okreś forme odpowiedzi', 'Tabela, punkty, JSON, ilość akapitów: powiedz, jaki format, a odpowiedź od razu sie przida.', PP.format[2]],
      constraints: ['Postow granice', 'Napisz, cego unikać i jak długo moze być odpowiedź. Wyraźne ograniceniy to cęść zalecyń Google.', PP.constraints[2]],
      examples: ['Pokoz przykład', 'Google radzi, coby zawse dować przykłady (few-shot): rózne, ale wsystkie w jednym, spójnym formacie.', PP.examples[2]],
      delimiters: ['Rozdziel cęści promptu', 'Ujmij polecyni, kontekst i dane w znacniki XML abo nagłówki Markdown. Wybierz jeden styl i ik nie mieszoj.', PP.delimiters[2]],
      questionLast: ['Pytanie na końcu', 'Przy długich promptach Google radzi: najpierw cały kontekst, na końcu pytanie, zacynając od „Na podstawie powyższych informacji…”.', PP.questionLast[2]],
      depth: ['Powiedz, jak dokładnie', 'Gemini 3 domyślnie odpowiado zwięźle. Proś o szczegóły, kroki abo konkretny ton, jak ik potrzebujesz.', PP.depth[2]],
    },

    planH: 'Twój plan',
    ctxYou: n => `Twoje wiadomości (${n})`,
    ctxGemini: n => `Odpowiedzi Gemini (${n})`,
    ctxImages: n => `Obrazy (${n})`,
    ctxFiles: n => `Inne pliki (${n})`,
    notCounted: 'niepoliczone', ctxTotal: 'Razem', ctxDraft: 'Szkic w polu',
    ctxBiggest: n => `Najdłuzsa odpowiedź (tura ${n})`,
    healthH: (u, m) => `Kontrola strony · znaleziono ${u} + ${m} tur`,
    h_transcript: 'Rozmowa', h_userTurn: 'Twoje wiadomości', h_modelTurn: 'Odpowiedzi Gemini', h_composer: 'Pole wiadomości',
    h_uploadChip: 'Dołączone pliki', h_canvasChip: 'Kafelki Canvas', h_codeBlock: 'Bloki kodu', h_generatedImage: 'Obrazy',
    notSeen: 'nie ma na stronie',
    refH: 'Skąd te liczby',
  };
  GTR_LANG_NAMES.gor = 'Gôrolsko';
})();
