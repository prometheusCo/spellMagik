/* =========================
   Spanish Syllabify Test Runner (vanilla JS, no HTML, no npm)
   Usage: Define a global function `syllabify(word)` (e.g., spell.splitInSyllables)
          Then paste this block and run `test();`
   Nota: El bloque EXTRA_CASES ha sido limpiado para quitar grafías no castellanas
         y corregir ortografías dudosas. Si quieres, puedo devolverte una versión
         RAE-verificada palabra por palabra.
   ========================= */

// ---- Guard: require global syllabify ----
function syllabify(w) {
    return spell.splitInSyllables(w);
}
if (typeof syllabify !== "function") {
    throw new Error("Missing global function `syllabify(word)`. Define it before running the tests.");
}

// ---- Minimal test framework (console-based) ----
const test = () => {
    const state = { total: 0, passed: 0, failed: 0, currentSuite: [] };

    const green = (s) => `%c${s}`;
    const red = (s) => `%c${s}`;
    const gcss = "color:#00c853";
    const rcss = "color:#ff1744";
    const ncss = "color:inherit";

    function log(msg, css = ncss) {
        if (css === gcss || css === rcss) console.log(msg.startsWith("%c") ? msg : "%c" + msg, css);
        else console.log(msg);
    }
    const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    function expect(actual) {
        return {
            toEqual(expected) {
                if (!deepEqual(actual, expected)) {
                    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
                }
            },
            toBe(val) {
                if (actual !== val) throw new Error(`Expected ${val}, got ${actual}`);
            },
            toBeGreaterThan(n) {
                if (!(actual > n)) throw new Error(`Expected > ${n}, got ${actual}`);
            },
            toBeTrue() {
                if (!actual) throw new Error(`Expected truthy, got ${actual}`);
            }
        };
    }

    function describe(name, fn) {
        state.currentSuite.push(name);
        log(`\n${state.currentSuite.map(() => "■").join("")} ${name}`);
        try { fn(); } finally { state.currentSuite.pop(); }
    }

    function it(name, fn) { // alias de test
        state.total++;
        try {
            fn();
            state.passed++;
            log(green(`  ✔ ${name}`), gcss);
        } catch (e) {
            state.failed++;
            log(red(`  ✖ ${name} → ${e.message}`), rcss);
        }
    }

    function testEach(cases, cb) {
        for (const args of cases) {
            const [label] = args;
            it(label, () => cb(...args));
        }
    }

    // ---- Test Utils ----
    function expectSyllables(word, expected) {
        const out = syllabify(word);
        expect(Array.isArray(out)).toBe(true);
        expect(out).toEqual(expected);
        out.forEach(s => expect(s.length).toBeGreaterThan(0));
        expect(out.join("")).toBe(word);
    }

    // ================== TESTS BASE ORIGINALES ==================
    describe("Spanish syllabification — production test suite", () => {

        // BASELINE
        describe("Baseline CV/CVC patterns", () => {
            testEach([
                ["casa", ["ca", "sa"]],
                ["lata", ["la", "ta"]],
                ["pata", ["pa", "ta"]],
                ["gato", ["ga", "to"]],
                ["mesa", ["me", "sa"]],
                ["sol", ["sol"]],
                ["barco", ["bar", "co"]],
                ["carta", ["car", "ta"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // DIPHTHONGS
        describe("Diphthongs (ai, ei, oi, au, eu, ou, ia, ie, io, ua, ue, uo, iu, ui)", () => {
            testEach([
                ["bueno", ["bue", "no"]],
                ["tierra", ["tie", "rra"]],
                ["ciudad", ["ciu", "dad"]],
                ["fuerte", ["fuer", "te"]],
                ["cuidado", ["cui", "da", "do"]],
                ["aire", ["ai", "re"]],
                ["peine", ["pei", "ne"]],
                ["boina", ["boi", "na"]],
                ["laurel", ["lau", "rel"]],
                ["Europa", ["Eu", "ro", "pa"]],
                ["causa", ["cau", "sa"]],
                ["viuda", ["viu", "da"]],
                ["pingüino", ["pin", "güi", "no"]],
                ["vergüenza", ["ver", "güen", "za"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // HIATUS WITH ACCENT
        describe("Hiatus caused by accent marks (í/ú with a/e/o; etc.)", () => {
            testEach([
                ["país", ["pa", "ís"]],
                ["baúl", ["ba", "úl"]],
                ["río", ["rí", "o"]],
                ["oír", ["o", "ír"]],
                ["prohíbe", ["pro", "hí", "be"]],
                ["Raúl", ["Ra", "úl"]],
                ["caía", ["ca", "í", "a"]],
                ["reúno", ["re", "ú", "no"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // TRIPHTHONGS
        describe("Triphthongs (weak+strong+weak)", () => {
            testEach([
                ["buey", ["buey"]],
                ["miau", ["miau"]],
                ["Uruguayo", ["U", "ru", "gua", "yo"]],
                ["averigüéis", ["a", "ve", "ri", "güéis"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // CLUSTERS
        describe("Consonant clusters in onset (pl, pr, bl, br, cl, cr, gl, gr, fl, fr, tr, dr)", () => {
            testEach([
                ["prado", ["pra", "do"]],
                ["blusa", ["blu", "sa"]],
                ["crisol", ["cri", "sol"]],
                ["grande", ["gran", "de"]],
                ["flor", ["flor"]],
                ["fruta", ["fru", "ta"]],
                ["triste", ["tris", "te"]],
                ["drama", ["dra", "ma"]],
                ["plato", ["pla", "to"]],
                ["brocha", ["bro", "cha"]],
                ["cráneo", ["crá", "ne", "o"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // S+CONSONANT WORDS
        describe("'s' + consonant clusters (es- + CC orthographic handling)", () => {
            testEach([
                ["escuela", ["es", "cue", "la"]],
                ["esqueleto", ["es", "que", "le", "to"]],
                ["estruendo", ["es", "truen", "do"]],
                ["España", ["Es", "pa", "ña"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // DIGRAPHS
        describe("Digraphs (ch, ll, rr) as single consonants", () => {
            testEach([
                ["mucho", ["mu", "cho"]],
                ["llama", ["lla", "ma"]],
                ["carro", ["ca", "rro"]],
                ["chorro", ["cho", "rro"]],
                ["paella", ["pa", "e", "lla"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // SILENT H
        describe("Silent 'h' behavior", () => {
            testEach([
                ["ahí", ["a", "hí"]],
                ["prohíbo", ["pro", "hí", "bo"]],
                ["vehículo", ["ve", "hí", "cu", "lo"]],
                ["desahucio", ["de", "sa", "hu", "cio"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // QU/GU/Ü
        describe("Qu/Gu with mute 'u' (and diaeresis 'ü')", () => {
            testEach([
                ["queso", ["que", "so"]],
                ["quinto", ["quin", "to"]],
                ["guitarra", ["gui", "ta", "rra"]],
                ["guerra", ["gue", "rra"]],
                ["pingüino", ["pin", "güi", "no"]],
                ["antigüedad", ["an", "ti", "güe", "dad"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // COMPLEX SPLITS
        describe("Complex clusters and internal splits", () => {
            testEach([
                ["transporte", ["trans", "por", "te"]],
                ["instante", ["ins", "tan", "te"]],
                ["convicción", ["con", "vic", "ción"]],
                ["obstruir", ["obs", "truir"]],
                ["subrayar", ["su", "bra", "yar"]],
                ["anglosajón", ["an", "glo", "sa", "jón"]],
                ["perspectiva", ["pers", "pec", "ti", "va"]],
                ["adscripción", ["ads", "crip", "ción"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // Y AS CONSONANT/SEMI-VOWEL
        describe("'y' consonant vs vowel/semivowel contexts", () => {
            testEach([
                ["yema", ["ye", "ma"]],
                ["hoy", ["hoy"]],
                ["muy", ["muy"]],
                ["ley", ["ley"]],
                ["reyes", ["re", "yes"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // UNICODE/CASE
        describe("Accents, case, and Unicode robustness", () => {
            testEach([
                ["CÁLIDO", ["CÁ", "LI", "DO"]],
                ["camión", ["ca", "mión"]],
                ["MAÍZ", ["MA", "ÍZ"]],
                ["Ñandú", ["Ñan", "dú"]],
                ["Saúl", ["Sa", "úl"]],
                ["río", ["rí", "o"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // EDGE CASES
        describe("Single-syllable words and edges", () => {
            testEach([
                ["sol", ["sol"]],
                ["gris", ["gris"]],
                ["cruz", ["cruz"]],
                ["yo", ["yo"]],
                ["ley", ["ley"]],
                ["buey", ["buey"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // INVARIANTS
        describe("Invariants", () => {
            const samples = [
                "bueno", "tierra", "ciudad", "río", "oír", "pingüino", "antigüedad",
                "transporte", "instante", "obstruir", "subrayar", "anglosajón",
                "CÁLIDO", "camión", "Ñandú", "Saúl", "buey", "yema", "hoy"
            ];
            it("No empty syllables; join equals input", () => {
                for (const w of samples) {
                    const syl = syllabify(w);
                    expect(syl.length).toBeGreaterThan(0);
                    syl.forEach(s => expect(s.length).toBeGreaterThan(0));
                    expect(syl.join("")).toBe(w);
                }
            });
            it("Each syllable has at least one vowel letter (or y final when applicable)", () => {
                const V = "aeiouáéíóúüAEIOUÁÉÍÓÚÜ";
                const isVowelish = (s) => [...s].some(ch => V.includes(ch)) || /[yY]$/.test(s);
                for (const w of samples) {
                    syllabify(w).forEach(s => expect(isVowelish(s)).toBeTrue());
                }
            });
        });

        // BORROWINGS (cultismos válidos)
        describe("Borrowings / learned words", () => {
            testEach([
                ["psicología", ["psi", "co", "lo", "gí", "a"]],
                ["gnóstico", ["gnós", "ti", "co"]],
                ["pterodáctilo", ["pte", "ro", "dác", "ti", "lo"]],
                ["mnémico", ["mné", "mi", "co"]],
            ], (word, expected) => expectSyllables(word, expected));
        });
    });

    // ================== EXTRA 100 (limpio: sin NO-castellanas; ortografía corregida) ==================
    const EXTRA_CASES = [
        // comunes
        ["camino", ["ca", "mi", "no"]],
        ["computadora", ["com", "pu", "ta", "do", "ra"]],
        ["biblioteca", ["bi", "blio", "te", "ca"]],
        ["programa", ["pro", "gra", "ma"]],
        ["problema", ["pro", "ble", "ma"]],
        ["planta", ["plan", "ta"]],
        ["brisa", ["bri", "sa"]],
        ["tráfico", ["trá", "fi", "co"]],
        ["cocina", ["co", "ci", "na"]],
        ["ventana", ["ven", "ta", "na"]],
        ["amigo", ["a", "mi", "go"]],
        ["familia", ["fa", "mi", "lia"]],
        ["historia", ["his", "to", "ria"]],
        ["matemática", ["ma", "te", "má", "ti", "ca"]],
        ["música", ["mú", "si", "ca"]],
        ["física", ["fí", "si", "ca"]],
        ["química", ["quí", "mi", "ca"]],
        ["género", ["gé", "ne", "ro"]],
        ["rápido", ["rá", "pi", "do"]],
        ["lógico", ["ló", "gi", "co"]],

        // diptongos/hiatos variados
        ["poeta", ["po", "e", "ta"]],
        ["maíz", ["ma", "íz"]],
        ["oasis", ["o", "a", "sis"]],
        ["reír", ["re", "ír"]],
        ["reúne", ["re", "ú", "ne"]],
        ["cuidado", ["cui", "da", "do"]],
        ["buitre", ["bui", "tre"]],
        ["cigüeña", ["ci", "güe", "ña"]],
        ["pingües", ["pin", "gües"]],
        ["lingüística", ["lin", "güís", "ti", "ca"]],
        ["averiguar", ["a", "ve", "ri", "guar"]],
        ["averigüé", ["a", "ve", "ri", "güé"]],
        ["vergüenza", ["ver", "güen", "za"]],

        // clusters pr/br/cr/fr/gr/tr/dr + pl/bl/cl/fl/gl
        ["prensa", ["pren", "sa"]],
        ["premio", ["pre", "mio"]],
        ["bravo", ["bra", "vo"]],
        ["brazo", ["bra", "zo"]],
        ["cráneo", ["crá", "ne", "o"]],
        ["crédito", ["cré", "di", "to"]],
        ["fruta", ["fru", "ta"]],
        ["fresco", ["fres", "co"]],
        ["grande", ["gran", "de"]],
        ["grupo", ["gru", "po"]],
        ["trenza", ["tren", "za"]],
        ["tres", ["tres"]],
        ["drama", ["dra", "ma"]],
        ["droga", ["dro", "ga"]],
        ["plato", ["pla", "to"]],
        ["pleno", ["ple", "no"]],
        ["blanco", ["blan", "co"]],
        ["bloque", ["blo", "que"]],
        ["clima", ["cli", "ma"]],
        ["clase", ["cla", "se"]],
        ["flaco", ["fla", "co"]],
        ["flujo", ["flu", "jo"]],
        ["globo", ["glo", "bo"]],
        ["gloria", ["glo", "ria"]],

        // h muda, qu/gu
        ["hueso", ["hue", "so"]],
        ["hielo", ["hie", "lo"]],
        ["ahora", ["a", "ho", "ra"]],
        ["alcohol", ["al", "co", "hol"]],
        ["deshonra", ["des", "hon", "ra"]],
        ["queja", ["que", "ja"]],
        ["quedar", ["que", "dar"]],
        ["guerra", ["gue", "rra"]],
        ["guitarra", ["gui", "ta", "rra"]],
        ["antiguo", ["an", "ti", "guo"]],

        // y consonante y vocal
        ["yema", ["ye", "ma"]],
        ["yerno", ["yer", "no"]],
        ["hoy", ["hoy"]],
        ["muy", ["muy"]],
        ["ley", ["ley"]],
        ["reyes", ["re", "yes"]],
        ["Uruguay", ["U", "ru", "guay"]],

        // hiatos acentuales
        ["baúl", ["ba", "úl"]],
        ["paella", ["pa", "e", "lla"]],
        ["prohíbo", ["pro", "hí", "bo"]],
        ["vehículo", ["ve", "hí", "cu", "lo"]],

        // cultismos / préstamos con grupos atípicos (válidos)
        ["psicología", ["psi", "co", "lo", "gí", "a"]],
        ["seudónimo", ["seu", "dó", "ni", "mo"]],
        ["gnóstico", ["gnós", "ti", "co"]],
        ["pterodáctilo", ["pte", "ro", "dác", "ti", "lo"]],
        ["mnémico", ["mné", "mi", "co"]],
        ["neumonía", ["neu", "mo", "ní", "a"]],
        ["neumático", ["neu", "má", "ti", "co"]],
        ["tmésis", ["tmé", "sis"]],

        // grupos internos (coda+ataque)
        ["transporte", ["trans", "por", "te"]],
        ["perspectiva", ["pers", "pec", "ti", "va"]],
        ["instinto", ["ins", "tin", "to"]],
        ["constante", ["cons", "tan", "te"]],
        ["absceso", ["abs", "ce", "so"]],
        ["adscripción", ["ads", "crip", "ción"]],
        ["obstrucción", ["obs", "truc", "ción"]],
        ["construir", ["cons", "truir"]],

        // nombres propios comunes
        ["Madrid", ["Ma", "drid"]],
        ["Barcelona", ["Bar", "ce", "lo", "na"]],
        ["Sevilla", ["Se", "vi", "lla"]],
        ["Zaragoza", ["Za", "ra", "go", "za"]],
        ["Valencia", ["Va", "len", "cia"]],

        // finales sencillos
        ["animal", ["a", "ni", "mal"]],
        ["hospital", ["hos", "pi", "tal"]],
        ["metal", ["me", "tal"]],
        ["papel", ["pa", "pel"]],
        ["hotel", ["ho", "tel"]],
        ["fácil", ["fá", "cil"]],
        ["difícil", ["di", "fí", "cil"]],
        ["utilidad", ["u", "ti", "li", "dad"]],
        ["realidad", ["re", "a", "li", "dad"]],
        ["sociedad", ["so", "cie", "dad"]],

        // más variadas para cubrir reglas
        ["acuífero", ["a", "cuí", "fe", "ro"]],
        ["Raúl", ["Ra", "úl"]],
        ["oía", ["o", "í", "a"]],
        ["trae", ["tra", "e"]],
        ["lingüista", ["lin", "güis", "ta"]],
        ["bilingüe", ["bi", "lin", "güe"]],
        ["antigüedad", ["an", "ti", "güe", "dad"]],
        ["sándwich", ["sánd", "wich"]],
        ["fútbol", ["fút", "bol"]],
        ["atún", ["a", "tún"]],
        ["cacahuete", ["ca", "ca", "hue", "te"]],
        ["ahijado", ["a", "hi", "ja", "do"]],
        ["desahucio", ["de", "sa", "hu", "cio"]],
    ];

    describe("EXTRA — Ampliación (limpio)", () => {
        testEach(EXTRA_CASES, (word, expected) => expectSyllables(word, expected));
    });

    // ---- Summary with accuracy ----
    const { total, passed, failed } = state;
    const pct = total ? Math.round((passed / total) * 10000) / 100 : 0;
    const summary = failed === 0
        ? green(`\nALL TESTS PASSED — ${passed}/${total} (${pct}%)`)
        : red(`\nTESTS FAILED — passed ${passed}/${total} (${pct}%), failed ${failed}`);
    log(summary, failed ? rcss : gcss);
};

// Ejecuta
test();
