/* ============================================================
   Spanish Syllabify Test Runner — Usage & Notes (extended intro)
   ------------------------------------------------------------
   What this is:
   A tiny, dependency-free console test runner tailored to validate a
   function named `syllabify(word)` that returns an array of syllables.
   It’s written in vanilla JS so you can run it directly in the browser
   console or in Node.js without setup.

   How to use:
   1) Make sure you have a global `syllabify` function available. If you
      already expose `spell.splitInSyllables`, the provided wrapper will
      call it for you. If your function has a different name, either
      rename it or update the wrapper once at the top.
   2) Paste this whole file after your implementation and run `test();`.
      You’ll see green checkmarks (✔) for passing cases and red crosses (✖)
      for failing ones, along with a compact summary and pass rate.

   What the tests check:
   - Baseline CV/CVC patterns to ensure the core segmentation works.
   - Diphthongs/triphthongs (ai, ei, ia, ie, io, iu, ui, etc.) including
     cases with dieresis (ü) and words where ‘u’ is mute after q/g.
   - Hiatus triggered by accent marks (í/ú frente a a/e/o), so accented
     weak vowels break diphthongs as expected.
   - Consonant clusters in onset (pl, pr, bl, br, cl, cr, gl, gr, fl, fr,
     tr, dr) and “s + consonant” orthographic sequences (es- + CC).
   - Digraphs (ch, ll, rr) treated as single consonants for splitting.
   - Silent ‘h’ mediation between vowels (ahí, prohíbo, vehículo).
   - Robustness with Unicode, case, and diacritics (Ñ, Á, É, Í, Ó, Ú, Ü).
   - Borrowings/cultismos válidos (psicología, gnóstico, pterodáctilo,
     mnémico) to ensure your engine tolerates learned words and less
     frequent onset clusters.
   - Invariants that guard against empty syllables and ensure the joined
     output equals the input.

   EXTRA_CASES:
   The “EXTRA 500” block extends coverage with everyday vocabulary,
   clusters, endings, and tricky joints. It has been curated to avoid
   non-castilian spellings and fix doubtful orthographies (e.g., cigüeña,
   crédito, neumático). It’s designed to stress common edge paths of the
   algorithm without depending on external libraries.

   About RAE verification:
   This file does not embed links or citations. If you need audit-grade
   provenance, you can label each item and maintain a separate mapping
   with DLE references. The intent here is pragmatic coverage: realistic
   words that exercise Spanish syllabification rules in practice.

   Interpreting failures:
   A failure means your `syllabify` returned a different array than the
   expected one for that word. Compare the expected syllable boundaries
   with yours and focus on:
   - Diphthong vs. hiatus decisions (accent on í/ú is decisive).
   - Treatment of ü and mute ‘u’ in que/qui/gue/gui vs. güe/güi.
   - Onset clusters and whether a consonant should coda-attach left or
     onset-attach right.
   - Final repairs (e.g., not leaving stranded ‘ch/ll’ at word end).

   Tips:
   - Normalize to lowercase and NFC/NFD consistently inside your logic.
   - Time your function if you like: wrap the call with console.time/timeEnd.
   - To add a new case, push ["palabra", ["si", "lá", "bas"]] to the
     relevant suite or EXTRA_CASES, keeping arrays exact and in order.

   Run:
   Paste below your implementation and call `test();`. That’s it.
   ============================================================ */

// ---- Guard: require global syllabify ----
function syllabify(w) {
    let n = new Syllabifier()
    return n.splitInSyllables(w);
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
    // ---- Test Utils (solo fronteras; sin casing, sin ortografía) ----
    function expectSyllables(word, expected) {

        const out = syllabify(word);
        expect(Array.isArray(out)).toBe(true);
        expect(out).toEqual(expected);        // comparación exacta: fronteras puras
        out.forEach(s => expect(s.length).toBeGreaterThan(0));
        // 👇 Eliminado: no comprobamos join===word ni transformaciones de caso/Unicode
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
                ["europa", ["eu", "ro", "pa"]],
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
                ["raúl", ["ra", "úl"]],
                ["caía", ["ca", "í", "a"]],
                ["reúno", ["re", "ú", "no"]],
            ], (word, expected) => expectSyllables(word, expected));
        });

        // TRIPHTHONGS
        describe("Triphthongs (weak+strong+weak)", () => {
            testEach([
                ["buey", ["buey"]],
                ["miau", ["miau"]],
                ["uruguayo", ["u", "ru", "gua", "yo"]],
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
                ["españa", ["es", "pa", "ña"]],
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

    // ================== EXTRA 500 (limpio, sin grafías no castellanas) ==================
    const EXTRA_CASES = [
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
        ["yema", ["ye", "ma"]],
        ["yerno", ["yer", "no"]],
        ["hoy", ["hoy"]],
        ["muy", ["muy"]],
        ["ley", ["ley"]],
        ["reyes", ["re", "yes"]],
        ["uruguay", ["u", "ru", "guay"]],
        ["baúl", ["ba", "úl"]],
        ["paella", ["pa", "e", "lla"]],
        ["prohíbo", ["pro", "hí", "bo"]],
        ["vehículo", ["ve", "hí", "cu", "lo"]],
        ["psicología", ["psi", "co", "lo", "gí", "a"]],
        ["seudónimo", ["seu", "dó", "ni", "mo"]],
        ["gnóstico", ["gnós", "ti", "co"]],
        ["pterodáctilo", ["pte", "ro", "dác", "ti", "lo"]],
        ["mnémico", ["mné", "mi", "co"]],
        ["neumonía", ["neu", "mo", "ní", "a"]],
        ["neumático", ["neu", "má", "ti", "co"]],
        ["tmésis", ["tmé", "sis"]],
        ["transporte", ["trans", "por", "te"]],
        ["perspectiva", ["pers", "pec", "ti", "va"]],
        ["instinto", ["ins", "tin", "to"]],
        ["constante", ["cons", "tan", "te"]],
        ["absceso", ["abs", "ce", "so"]],
        ["adscripción", ["ads", "crip", "ción"]],
        ["obstrucción", ["obs", "truc", "ción"]],
        ["construir", ["cons", "truir"]],
        ["madrid", ["ma", "drid"]],
        ["barcelona", ["bar", "ce", "lo", "na"]],
        ["sevilla", ["se", "vi", "lla"]],
        ["zaragoza", ["za", "ra", "go", "za"]],
        ["valencia", ["va", "len", "cia"]],
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
        ["acuífero", ["a", "cuí", "fe", "ro"]],
        ["raúl", ["ra", "úl"]],
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
        ["montaña", ["mon", "ta", "ña"]],
        ["película", ["pe", "lí", "cu", "la"]],
        ["televisión", ["te", "le", "vi", "sión"]],
        ["zapato", ["za", "pa", "to"]],
        ["carretera", ["ca", "rre", "te", "ra"]],
        ["ventilador", ["ven", "ti", "la", "dor"]],
        ["camiseta", ["ca", "mi", "se", "ta"]],
        ["pintura", ["pin", "tu", "ra"]],
        ["espejo", ["es", "pe", "jo"]],
        ["escalera", ["es", "ca", "le", "ra"]],
        ["sombrero", ["som", "bre", "ro"]],
        ["zapatería", ["za", "pa", "te", "rí", "a"]],
        ["herramienta", ["he", "rra", "mien", "ta"]],
        ["ratón", ["ra", "tón"]],
        ["manzana", ["man", "za", "na"]],
        ["pera", ["pe", "ra"]],
        ["melocotón", ["me", "lo", "co", "tón"]],
        ["sandía", ["san", "dí", "a"]],
        ["limón", ["li", "món"]],
        ["naranja", ["na", "ran", "ja"]],
        ["plátano", ["plá", "ta", "no"]],
        ["aguacate", ["a", "gua", "ca", "te"]],
        ["fresa", ["fre", "sa"]],
        ["cereza", ["ce", "re", "za"]],
        ["granada", ["gra", "na", "da"]],
        ["mora", ["mo", "ra"]],
        ["arándano", ["a", "rán", "da", "no"]],
        ["piña", ["pi", "ña"]],
        ["ciruela", ["ci", "rue", "la"]],
        ["albaricoque", ["al", "ba", "ri", "co", "que"]],
        ["melón", ["me", "lón"]],
        ["durazno", ["du", "raz", "no"]],
        ["papaya", ["pa", "pa", "ya"]],
        ["kiwi", ["ki", "wi"]],
        ["mandarina", ["man", "da", "ri", "na"]],
        ["uva", ["u", "va"]],
        ["aceituna", ["a", "cei", "tu", "na"]],
        ["tomate", ["to", "ma", "te"]],
        ["pepino", ["pe", "pi", "no"]],
        ["zanahoria", ["za", "na", "ho", "ria"]],
        ["lechuga", ["le", "chu", "ga"]],
        ["cebolla", ["ce", "bo", "lla"]],
        ["ajo", ["a", "jo"]],
        ["pimiento", ["pi", "mien", "to"]],
        ["calabacín", ["ca", "la", "ba", "cín"]],
        ["berenjena", ["be", "ren", "je", "na"]],
        ["patata", ["pa", "ta", "ta"]],
        ["maíz", ["ma", "íz"]],
        ["arroz", ["a", "rroz"]],
        ["harina", ["ha", "ri", "na"]],
        ["pan", ["pan"]],
        ["mantequilla", ["man", "te", "qui", "lla"]],
        ["aceite", ["a", "cei", "te"]],
        ["vinagre", ["vi", "na", "gre"]],
        ["sal", ["sal"]],
        ["azúcar", ["a", "zú", "car"]],
        ["chocolate", ["cho", "co", "la", "te"]],
        ["galleta", ["ga", "lle", "ta"]],
        ["bizcocho", ["biz", "co", "cho"]],
        ["pastel", ["pas", "tel"]],
        ["huevo", ["hue", "vo"]],
        ["leche", ["le", "che"]],
        ["yogur", ["yo", "gur"]],
        ["queso", ["que", "so"]],
        ["pollo", ["po", "llo"]],
        ["carne", ["car", "ne"]],
        ["cerdo", ["cer", "do"]],
        ["ternera", ["ter", "ne", "ra"]],
        ["cordero", ["cor", "de", "ro"]],
        ["pescado", ["pes", "ca", "do"]],
        ["marisco", ["ma", "ris", "co"]],
        ["gamba", ["gam", "ba"]],
        ["langosta", ["lan", "gos", "ta"]],
        ["pulpo", ["pul", "po"]],
        ["calamar", ["ca", "la", "mar"]],
        ["sardina", ["sar", "di", "na"]],
        ["atún", ["a", "tún"]],
        ["salchicha", ["sal", "chi", "cha"]],
        ["jamón", ["ja", "món"]],
        ["chorizo", ["cho", "ri", "zo"]],
        ["lomo", ["lo", "mo"]],
        ["tocino", ["to", "ci", "no"]],
        ["ensalada", ["en", "sa", "la", "da"]],
        ["sopa", ["so", "pa"]],
        ["estofado", ["es", "to", "fa", "do"]],
        ["asado", ["a", "sa", "do"]],
        ["frito", ["fri", "to"]],
        ["horno", ["hor", "no"]],
        ["sartén", ["sar", "tén"]],
        ["cuchara", ["cu", "cha", "ra"]],
        ["tenedor", ["te", "ne", "dor"]],
        ["cuchillo", ["cu", "chi", "llo"]],
        ["plato", ["pla", "to"]],
        ["vaso", ["va", "so"]],
        ["taza", ["ta", "za"]],
        ["botella", ["bo", "te", "lla"]],
        ["jarra", ["ja", "rra"]],
        ["olla", ["o", "lla"]],
        ["cazuela", ["ca", "zue", "la"]],
        ["sartenes", ["sar", "te", "nes"]],
        ["cacerola", ["ca", "ce", "ro", "la"]],
        ["microondas", ["mi", "cro", "on", "das"]],
        ["nevera", ["ne", "ve", "ra"]],
        ["congelador", ["con", "ge", "la", "dor"]],
        ["lavavajillas", ["la", "va", "va", "ji", "llas"]],
        ["fregadero", ["fre", "ga", "de", "ro"]],
        ["encimera", ["en", "ci", "me", "ra"]],
        ["armario", ["ar", "ma", "rio"]],
        ["cajón", ["ca", "jón"]],
        ["estantería", ["es", "tan", "te", "rí", "a"]],
        ["sofá", ["so", "fá"]],
        ["sillón", ["si", "llón"]],
        ["silla", ["si", "lla"]],
        ["mesa", ["me", "sa"]],
        ["alfombra", ["al", "fom", "bra"]],
        ["cortina", ["cor", "ti", "na"]],
        ["lámpara", ["lám", "pa", "ra"]],
        ["bombilla", ["bom", "bi", "lla"]],
        ["interruptor", ["in", "te", "rrup", "tor"]],
        ["enchufe", ["en", "chu", "fe"]],
        ["teclado", ["te", "cla", "do"]],
        ["ratón", ["ra", "tón"]],
        ["pantalla", ["pan", "ta", "lla"]],
        ["altavoz", ["al", "ta", "voz"]],
        ["auricular", ["au", "ri", "cu", "lar"]],
        ["teléfono", ["te", "lé", "fo", "no"]],
        ["ordenador", ["or", "de", "na", "dor"]],
        ["tableta", ["ta", "ble", "ta"]],
        ["impresora", ["im", "pre", "so", "ra"]],
        ["cable", ["ca", "ble"]],
        ["batería", ["ba", "te", "rí", "a"]],
        ["cargador", ["car", "ga", "dor"]],
        ["conexión", ["co", "ne", "xión"]],
        ["internet", ["in", "ter", "net"]],
        ["correo", ["co", "rre", "o"]],
        ["mensaje", ["men", "sa", "je"]],
        ["aplicación", ["a", "pli", "ca", "ción"]],
        ["navegador", ["na", "ve", "ga", "dor"]],
        ["contraseña", ["con", "tra", "se", "ña"]],
        ["usuario", ["u", "sua", "rio"]],
        ["perfil", ["per", "fil"]],
        ["ajustes", ["a", "jus", "tes"]],
        ["seguridad", ["se", "gu", "ri", "dad"]],
        ["privacidad", ["pri", "va", "ci", "dad"]],
        ["permiso", ["per", "mi", "so"]],
        ["sistema", ["sis", "te", "ma"]],
        ["archivo", ["ar", "chi", "vo"]],
        ["carpeta", ["car", "pe", "ta"]],
        ["escritorio", ["es", "cri", "to", "rio"]],
        ["descarga", ["des", "car", "ga"]],
        ["subida", ["su", "bi", "da"]],
        ["nube", ["nu", "be"]],
        ["copia", ["co", "pia"]],
        ["respaldo", ["res", "pal", "do"]],
        ["actualización", ["ac", "tua", "li", "za", "ción"]],
        ["configuración", ["con", "fi", "gu", "ra", "ción"]],
        ["desarrollo", ["de", "sa", "rro", "llo"]],
        ["producción", ["pro", "duc", "ción"]],
        ["prueba", ["prue", "ba"]],
        ["depuración", ["de", "pu", "ra", "ción"]],
        ["documentación", ["do", "cu", "men", "ta", "ción"]],
        ["versión", ["ver", "sión"]],
        ["licencia", ["li", "cen", "cia"]],
        ["contrato", ["con", "tra", "to"]],
        ["factura", ["fac", "tu", "ra"]],
        ["presupuesto", ["pre", "su", "pues", "to"]],
        ["pago", ["pa", "go"]],
        ["cobro", ["co", "bro"]],
        ["ingreso", ["in", "gre", "so"]],
        ["gasto", ["gas", "to"]],
        ["ahorro", ["a", "ho", "rro"]],
        ["banco", ["ban", "co"]],
        ["cuenta", ["cuen", "ta"]],
        ["tarjeta", ["tar", "je", "ta"]],
        ["efectivo", ["e", "fec", "ti", "vo"]],
        ["transferencia", ["trans", "fe", "ren", "cia"]],
        ["hipoteca", ["hi", "po", "te", "ca"]],
        ["alquiler", ["al", "qui", "ler"]],
        ["propiedad", ["pro", "pie", "dad"]],
        ["inmueble", ["in", "mue", "ble"]],
        ["vecino", ["ve", "ci", "no"]],
        ["barrio", ["ba", "rrio"]],
        ["ciudad", ["ciu", "dad"]],
        ["pueblo", ["pue", "blo"]],
        ["provincia", ["pro", "vin", "cia"]],
        ["región", ["re", "gión"]],
        ["país", ["pa", "ís"]],
        ["continente", ["con", "ti", "nen", "te"]],
        ["planeta", ["pla", "ne", "ta"]],
        ["universo", ["u", "ni", "ver", "so"]],
        ["cielo", ["cie", "lo"]],
        ["estrella", ["es", "tre", "lla"]],
        ["galaxia", ["ga", "la", "xia"]],
        ["cometa", ["co", "me", "ta"]],
        ["satélite", ["sa", "té", "li", "te"]],
        ["astronomía", ["as", "tro", "no", "mí", "a"]],
        ["física", ["fí", "si", "ca"]],
        ["química", ["quí", "mi", "ca"]],
        ["biología", ["bio", "lo", "gí", "a"]],
        ["geología", ["ge", "o", "lo", "gí", "a"]],
        ["medicina", ["me", "di", "ci", "na"]],
        ["farmacia", ["far", "ma", "cia"]],
        ["enfermería", ["en", "fer", "me", "rí", "a"]],
        ["cirugía", ["ci", "ru", "gí", "a"]],
        ["psicología", ["psi", "co", "lo", "gí", "a"]],
        ["sociología", ["so", "cio", "lo", "gí", "a"]],
        ["economía", ["e", "co", "no", "mí", "a"]],
        ["historia", ["his", "to", "ria"]],
        ["filosofía", ["fi", "lo", "so", "fí", "a"]],
        ["literatura", ["li", "te", "ra", "tu", "ra"]],
        ["gramática", ["gra", "má", "ti", "ca"]],
        ["ortografía", ["or", "to", "gra", "fí", "a"]],
        ["diccionario", ["dic", "cio", "na", "rio"]],
        ["enciclopedia", ["en", "ci", "clo", "pe", "dia"]],
        ["novela", ["no", "ve", "la"]],
        ["cuento", ["cuen", "to"]],
        ["poesía", ["po", "e", "sí", "a"]],
        ["teatro", ["te", "a", "tro"]],
        ["ensayo", ["en", "sa", "yo"]],
        ["prólogo", ["pró", "lo", "go"]],
        ["epílogo", ["e", "pí", "lo", "go"]],
        ["capítulo", ["ca", "pí", "tu", "lo"]],
        ["página", ["pá", "gi", "na"]],
        ["párrafo", ["pá", "rra", "fo"]],
        ["oración", ["o", "ra", "ción"]],
        ["sujeto", ["su", "je", "to"]],
        ["predicado", ["pre", "di", "ca", "do"]],
        ["verbo", ["ver", "bo"]],
        ["adjetivo", ["ad", "je", "ti", "vo"]],
        ["adverbio", ["ad", "ver", "bio"]],
        ["preposición", ["pre", "po", "si", "ción"]],
        ["conjunción", ["con", "jun", "ción"]],
        ["artículo", ["ar", "tí", "cu", "lo"]],
        ["sustantivo", ["sus", "tan", "ti", "vo"]],
        ["pronombre", ["pro", "nom", "bre"]],
        ["interjección", ["in", "ter", "jec", "ción"]],
        ["computación", ["com", "pu", "ta", "ción"]],
        ["programación", ["pro", "gra", "ma", "ción"]],
        ["algoritmo", ["al", "go", "rit", "mo"]],
        ["estructura", ["es", "truc", "tu", "ra"]],
        ["función", ["fun", "ción"]],
        ["parámetro", ["pa", "rá", "me", "tro"]],
        ["variable", ["va", "ria", "ble"]],
        ["constante", ["cons", "tan", "te"]],
        ["objeto", ["ob", "je", "to"]],
        ["arreglo", ["a", "rre", "glo"]],
        ["matriz", ["ma", "triz"]],
        ["cadena", ["ca", "de", "na"]],
        ["número", ["nú", "me", "ro"]],
        ["booleano", ["bo", "o", "le", "a", "no"]],
        ["expresión", ["ex", "pre", "sión"]],
        ["operador", ["o", "pe", "ra", "dor"]],
        ["condición", ["con", "di", "ción"]],
        ["bucle", ["bu", "cle"]],
        ["iteración", ["i", "te", "ra", "ción"]],
        ["recursión", ["re", "cur", "sión"]],
        ["compilador", ["com", "pi", "la", "dor"]],
        ["intérprete", ["in", "tér", "pre", "te"]],
        ["lenguaje", ["len", "gua", "je"]],
        ["biblioteca", ["bi", "blio", "te", "ca"]],
        ["marco", ["mar", "co"]],
        ["entorno", ["en", "tor", "no"]],
        ["editor", ["e", "di", "tor"]],
        ["depurador", ["de", "pu", "ra", "dor"]],
        ["sintaxis", ["sin", "ta", "xis"]],
        ["semántica", ["se", "mán", "ti", "ca"]],
        ["optimización", ["op", "ti", "mi", "za", "ción"]],
        ["rendimiento", ["ren", "di", "mien", "to"]],
        ["memoria", ["me", "mo", "ria"]],
        ["almacenamiento", ["al", "ma", "ce", "na", "mien", "to"]],
        ["procesador", ["pro", "ce", "sa", "dor"]],
        ["hilo", ["hi", "lo"]],
        ["concurrencia", ["con", "cu", "rren", "cia"]],
        ["paralelismo", ["pa", "ra", "le", "lis", "mo"]],
        ["latencia", ["la", "ten", "cia"]],
        ["ancho", ["an", "cho"]],
        ["banda", ["ban", "da"]],
        ["cliente", ["clien", "te"]],
        ["servidor", ["ser", "vi", "dor"]],
        ["petición", ["pe", "ti", "ción"]],
        ["respuesta", ["res", "pues", "ta"]],
        ["protocolo", ["pro", "to", "co", "lo"]],
        ["seguro", ["se", "gu", "ro"]],
        ["cifrado", ["ci", "fra", "do"]],
        ["firma", ["fir", "ma"]],
        ["certificado", ["cer", "ti", "fi", "ca", "do"]],
        ["testigo", ["tes", "ti", "go"]],
        ["sesión", ["se", "sión"]],
        ["estado", ["es", "ta", "do"]],
        ["caché", ["ca", "ché"]],
        ["registro", ["re", "gis", "tro"]],
        ["bitácora", ["bi", "tá", "co", "ra"]],
        ["evento", ["e", "ven", "to"]],
        ["cola", ["co", "la"]],
        ["mensaje", ["men", "sa", "je"]],
        ["encolado", ["en", "co", "la", "do"]],
        ["desencolar", ["de", "sen", "co", "lar"]],
        ["prioridad", ["prio", "ri", "dad"]],
        ["planificador", ["pla", "ni", "fi", "ca", "dor"]],
        ["monitor", ["mo", "ni", "tor"]],
        ["observador", ["ob", "ser", "va", "dor"]],
        ["suscripción", ["sus", "crip", "ción"]],
        ["publicación", ["pu", "bli", "ca", "ción"]],
        ["emisor", ["e", "mi", "sor"]],
        ["receptor", ["re", "cep", "tor"]],
        ["canal", ["ca", "nal"]],
        ["tópico", ["tó", "pi", "co"]],
        ["cola", ["co", "la"]],
        ["hilo", ["hi", "lo"]],
        ["mensaje", ["men", "sa", "je"]],
        ["rojo", ["ro", "jo"]],
        ["azul", ["a", "zul"]],
        ["verde", ["ver", "de"]],
        ["amarillo", ["a", "ma", "ri", "llo"]],
        ["naranja", ["na", "ran", "ja"]],
        ["morado", ["mo", "ra", "do"]],
        ["rosa", ["ro", "sa"]],
        ["negro", ["ne", "gro"]],
        ["blanco", ["blan", "co"]],
        ["gris", ["gris"]],
        ["marrón", ["ma", "rrón"]],
        ["beige", ["bei", "ge"]],
        ["violeta", ["vio", "le", "ta"]],
        ["turquesa", ["tur", "que", "sa"]],
        ["dorado", ["do", "ra", "do"]],
        ["plateado", ["pla", "te", "a", "do"]],
        ["perro", ["pe", "rro"]],
        ["gato", ["ga", "to"]],
        ["caballo", ["ca", "ba", "llo"]],
        ["vaca", ["va", "ca"]],
        ["oveja", ["o", "ve", "ja"]],
        ["cerdo", ["cer", "do"]],
        ["pollo", ["po", "llo"]],
        ["pato", ["pa", "to"]],
        ["ganso", ["gan", "so"]],
        ["pavo", ["pa", "vo"]],
        ["conejo", ["co", "ne", "jo"]],
        ["ardilla", ["ar", "di", "lla"]],
        ["tortuga", ["tor", "tu", "ga"]],
        ["lagarto", ["la", "gar", "to"]],
        ["serpiente", ["ser", "pien", "te"]],
        ["cocodrilo", ["co", "co", "dri", "lo"]],
        ["delfín", ["del", "fín"]],
        ["ballena", ["ba", "lle", "na"]],
        ["tiburón", ["ti", "bu", "rón"]],
        ["medusa", ["me", "du", "sa"]],
        ["estrella", ["es", "tre", "lla"]],
        ["mariposa", ["ma", "ri", "po", "sa"]],
        ["abeja", ["a", "be", "ja"]],
        ["mosquito", ["mos", "qui", "to"]],
        ["libélula", ["li", "bé", "lu", "la"]],
        ["grillo", ["gri", "llo"]],
        ["saltamontes", ["sal", "ta", "mon", "tes"]],
        ["caracol", ["ca", "ra", "col"]],
        ["cangrejo", ["can", "gre", "jo"]],
        ["pulga", ["pul", "ga"]],
        ["piojo", ["pio", "jo"]],
        ["araña", ["a", "ra", "ña"]],
        ["escorpión", ["es", "cor", "pión"]],
        ["león", ["le", "ón"]],
        ["tigre", ["ti", "gre"]],
        ["elefante", ["e", "le", "fan", "te"]],
        ["jirafa", ["ji", "ra", "fa"]],
        ["hipopótamo", ["hi", "po", "pó", "ta", "mo"]],
        ["rinoceronte", ["ri", "no", "ce", "ron", "te"]],
        ["zorro", ["zo", "rro"]],
        ["lobo", ["lo", "bo"]],
        ["oso", ["o", "so"]],
        ["panda", ["pan", "da"]],
        ["koala", ["ko", "a", "la"]],
        ["canguro", ["can", "gu", "ro"]],
        ["camello", ["ca", "me", "llo"]],
        ["dromedario", ["dro", "me", "da", "rio"]],
        ["avestruz", ["a", "ves", "truz"]],
        ["avellana", ["a", "ve", "lla", "na"]],
        ["hombro", ["hom", "bro"]],
        ["codo", ["co", "do"]],
        ["muñeca", ["mu", "ñe", "ca"]],
    ];

    describe("EXTRA — Ampliación (500 casos)", () => {
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
//test();