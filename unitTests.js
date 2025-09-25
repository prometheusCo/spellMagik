
// ---------- Minimal Test Framework ----------
const logEl = document.getElementById("log");
function log(msg, cls = "") {
    const span = document.createElement("div");
    if (cls) span.className = cls;
    span.textContent = msg;
    logEl.appendChild(span);
}
function expect(actual) {
    return {
        toEqual(expected) {
            const ok = JSON.stringify(actual) === JSON.stringify(expected);
            if (!ok) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
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
    log(name);
    fn();
}
function test(name, fn) {
    try {
        fn();
        log("  ✔ " + name, "pass");
    } catch (e) {
        log("  ✖ " + name + " → " + e.message, "fail");
    }
}

// ---------- Function under test (placeholder) ----------
function syllabify(word) {
    // TODO: plug in your real syllabifier
    return [word];
}

// ---------- Test Utilities ----------
function expectSyllables(word, expected) {
    const out = syllabify(word);
    expect(Array.isArray(out)).toBe(true);
    expect(out).toEqual(expected);
    out.forEach(s => expect(s.length).toBeGreaterThan(0));
    expect(out.join("")).toBe(word);
}

// ---------- Tests (same logic as Jest version) ----------
describe("Spanish syllabification — production test suite", () => {
    describe("Baseline CV/CVC patterns", () => {
        test("casa", () => expectSyllables("casa", ["ca", "sa"]));
        test("lata", () => expectSyllables("lata", ["la", "ta"]));
        test("gato", () => expectSyllables("gato", ["ga", "to"]));
    });

    describe("Diphthongs", () => {
        test("bueno", () => expectSyllables("bueno", ["bue", "no"]));
        test("tierra", () => expectSyllables("tierra", ["tie", "rra"]));
    });

    describe("Hiatus with accent", () => {
        test("país", () => expectSyllables("país", ["pa", "ís"]));
        test("baúl", () => expectSyllables("baúl", ["ba", "úl"]));
    });

    describe("Triphthongs", () => {
        test("buey", () => expectSyllables("buey", ["buey"]));
        test("miau", () => expectSyllables("miau", ["miau"]));
    });

    describe("Clusters", () => {
        test("prado", () => expectSyllables("prado", ["pra", "do"]));
        test("flor", () => expectSyllables("flor", ["flor"]));
    });

    describe("Digraphs", () => {
        test("mucho", () => expectSyllables("mucho", ["mu", "cho"]));
        test("llama", () => expectSyllables("llama", ["lla", "ma"]));
    });

    describe("Silent h", () => {
        test("ahí", () => expectSyllables("ahí", ["a", "hí"]));
        test("prohíbe", () => expectSyllables("prohíbe", ["pro", "hí", "be"]));
    });

    describe("Qu/gu/ü", () => {
        test("queso", () => expectSyllables("queso", ["que", "so"]));
        test("pingüino", () => expectSyllables("pingüino", ["pin", "güi", "no"]));
    });

    describe("Integrity checks", () => {
        test("join matches original", () => {
            const samples = ["bueno", "tierra", "país", "buey", "queso"];
            samples.forEach(w => {
                const syl = syllabify(w);
                expect(syl.join("")).toBe(w);
            });
        });
    });
});
