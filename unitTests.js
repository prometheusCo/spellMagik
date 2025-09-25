/* =========================
   Spanish Syllabify Test Runner (vanilla JS, no HTML, no npm)
   Usage: 1) Define a global function `syllabify(word)` in this page/context.
          2) Paste this whole block in the browser console and run.
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

    function deepEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

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

    function test(name, fn) {
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

    function testEach(cases, cbBuilder) {
        for (const args of cases) {
            const [label] = args;
            test(label, () => cbBuilder(...args));
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

    // ================== TESTS ==================
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
                // extra synthetic edge
                ["reúno", ["re", "ú", "no"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // TRIPHTHONGS
        describe("Triphthongs (weak+strong+weak)", () => {
            testEach([
                ["buey", ["buey"]],
                ["miau", ["miau"]],
                ["Uruguayo", ["U", "ru", "guay", "o"]],
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
                ["desahucio", ["de", "sau", "cio"]],
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
                ["subrayar", ["sub", "ra", "yar"]],
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

            test("No empty syllables; join equals input", () => {
                for (const w of samples) {
                    const syl = syllabify(w);
                    expect(syl.length).toBeGreaterThan(0);
                    syl.forEach(s => expect(s.length).toBeGreaterThan(0));
                    expect(syl.join("")).toBe(w);
                }
            });

            test("Each syllable has at least one vowel letter (or y final when applicable)", () => {
                const V = "aeiouáéíóúüAEIOUÁÉÍÓÚÜ";
                const isVowelish = (s) => [...s].some(ch => V.includes(ch)) || /[yY]$/.test(s);
                for (const w of samples) {
                    syllabify(w).forEach(s => expect(isVowelish(s)).toBeTrue());
                }
            });
        });

        // BORROWINGS (tune if your splitter rejects them)
        describe("Borrowings / learned words", () => {
            testEach([
                ["psicología", ["psi", "co", "lo", "gí", "a"]],
                ["gnóstico", ["gnós", "ti", "co"]],
                ["pterodáctilo", ["pte", "ro", "dác", "ti", "lo"]],
                ["mnémico", ["mné", "mi", "co"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

    });

    // ---- Summary ----
    const { total, passed, failed } = state;
    const summary = failed === 0
        ? green(`\nALL TESTS PASSED — ${passed}/${total}`)
        : red(`\nTESTS FAILED — passed ${passed}/${total}, failed ${failed}`);
    log(summary, failed ? rcss : gcss);
};
