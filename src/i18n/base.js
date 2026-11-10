// Registry for the interface texts. Each language lives in its own file in this
// folder and adds itself here, so a build can ship just one of them. A value is
// a string, or a function of the numbers it shows.
globalThis.GTR_I18N = globalThis.GTR_I18N || {};
globalThis.GTR_LANG_NAMES = globalThis.GTR_LANG_NAMES || {};
// The five languages and the order the dropdown lists them in. A build that ships
// fewer simply leaves the missing files out. The dialects start from the Polish
// texts, so pl.js must load before csb.js, szl.js and gor.js.
globalThis.GTR_LANG_ORDER = ['pl', 'en', 'csb', 'szl', 'gor'];
