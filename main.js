// Core utility methods
class coreFunctions {

    //
    minSimilarity = 0.7;

    //
    epochs = 3;

    dictionaryUrl = "https://raw.githubusercontent.com/prometheusCo/spellMagik/refs/heads/main/dictionaryC.txt";

    dictData; dictMapped = new Map();

    // Vowels used to better clasification
    vowels = new Set(['a', 'e', 'o', 'u', 'i', '$']);

    // Consonants types  used for ruling out of syllables
    plosives = new Set(["PC", "p", "t", "k", "b", "d", "g", "#"]);
    fricatives = new Set(["FC", "f", "s", "j", "z", "#"]);
    affricates = new Set(["AFC", "ch", "#"]);
    nasals = new Set(["NC", "m", "n", "ñ", "#"]);
    laterals = new Set(["LC", "l", "ll", "#"]);
    approximants = new Set(["AC", "b", "x", "#"]);
    vibrants = new Set(["BC", "r", "rr", "#"]);

    // Used to rule in valid vocals joins
    diphthongsAndtriphthongs = new Set([
        "ia", "ie", "io", 'uei',
        "ua", "ue", "uo", "ió",
        "ai", "ei", "oi",
        "au", "eu", "ou",
        "iu", "ui", "ai",
        "üi", "üe", "üa",
        "üé", "uí", "üí"
    ]);

    // Valid two-consonant ONSET clusters by consonant (sound) TYPE
    valid2CSounds = new Set([
        "PCLC", // pl, bl, cl, gl
        "PCBC", // pr, br, tr, dr, cr, gr
        "FCBC", // fr
        "FCLC",
    ]);

    //
    twoLettersSounds = new Set(["rr", "ll", "ch"]);

    // Used to determine if a syllable is misspelled by looking at it's ending letters
    invalidSyllablesEndings = new Set(["k", "g", "c", "x", "f", "d", "v"]);
    invalidSyllablesEndingsExceptions = new Set(["ac", "oc", "ec", "ic", "ag", "ex", "ed"]);

    // Invalid word's starts that makes a syllable be considered misspelled
    invalidStarts = new Set(["ki", "qi", "vr"]);

    // Used to know if we must go a litle further on the heuristic syllable generation
    // This set won't invalidate a syllable but it will force the program to look for another
    // valid mutation in case this result in an invalid word creation
    suspiciousStarts = new Set(["w", "k"]);

    //
    // Simple one-liner helpers
    clean = s => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    pos = n => n < 0 ? n * (-1) : n;
    isValid = val => val !== undefined && val !== "" && val !== null && val !== "undefined";
    replaceCharAt = (str, pos, char) => str.slice(0, pos) + char + str.slice(pos + 1);
    splitArrayAt = (arr, pos) => [arr.slice(0, pos), arr.slice(pos)];
    insertChar = (y, x, c) => y.slice(0, x + 1) + c + y.slice(x + 1);
    isTwoLettersSounds = ll => this.twoLettersSounds.has(ll);
    //
    //
    dictionaryLoad(url) {

        const ok = r => (r.ok ? r : Promise.reject(new Error(`Failed: ${r.status} ${r.statusText}`)));
        const set = t => (this.dictData = t, t && this.prepareDict());

        const isB64 = s => /^[A-Za-z0-9+/=\s]+$/.test(s) && (s.replace(/\s+/g, "").length % 4 === 0);
        const fromB64 = s => {
            const bin = atob(s.replace(/\s+/g, ""));
            const out = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
            return out;
        };
        const fromBin = s => {
            const out = new Uint8Array(s.length);
            for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 255;
            return out;
        };
        const toBytes = s => (isB64(s) ? fromB64(s) : fromBin(s));
        const gunzip = bytes => {
            const ds = new DecompressionStream("gzip");
            const stream = new Response(bytes).body.pipeThrough(ds);
            return new Response(stream).text();
        };

        return fetch(url)
            .then(ok)
            .then(r => r.text())
            .then(s => gunzip(toBytes(s)))
            .then(set);
    }


    //
    //Litle  helper to measure code exec time
    printTime(start, msg = "miScript:", fixed = 2) {

        const end = performance.now();
        const seconds = (end - start) / 1000;
        console.log(msg, seconds.toFixed(fixed), " segs");
    }

    //
    // Given a word, return its V/C structure (e.g., VOWEL + CONSONANT + VOWEL…)
    getEst(word, returnType = "string") {

        if (!this.isValid(word)) return "";
        word = this.clean(word)
        let r = word.split("").map((a) => this.vowels.has(a) ? "V" : "C");
        if (returnType === "string")
            return r.join("");

        return r;
    }
    //
    //

    diffScoreStrings(a, b, weights = { ins: 0.7, del: 1.3, sub: 1.0 }) {

        const m = a.length;
        const n = b.length;

        // DP optimizado a 2 filas
        const [s, t] = m < n ? [a, b] : [b, a];
        const rows = s.length + 1;
        const cols = t.length + 1;

        let prev = new Float32Array(cols);
        let curr = new Float32Array(cols);

        for (let j = 0; j < cols; j++) prev[j] = j * weights.ins;

        for (let i = 1; i < rows; i++) {
            curr[0] = i * weights.del;
            const si = s.charCodeAt(i - 1);
            for (let j = 1; j < cols; j++) {
                const tj = t.charCodeAt(j - 1);
                const cost = si === tj ? 0 : weights.sub;
                const del = prev[j] + weights.del;
                const ins = curr[j - 1] + weights.ins;
                const sub = prev[j - 1] + cost;
                curr[j] = Math.min(del, ins, sub);
            }
            [prev, curr] = [curr, prev];
        }

        const distance = prev[cols - 1];
        const maxLen = Math.max(m, n) || 1;
        const worst = maxLen * Math.max(weights.ins, weights.del, weights.sub);

        const similarity = 1 - distance / worst;
        return 0.1 + similarity * 0.89; // escala 0.1–0.99
    }

    //
    // Try to find a match for a `word` inside an `array`. If `loose` is false → only exact matches are found
    // if `loose` is true → near matches are allow . Returns the first matching element, or `false`.
    // 
    reverseSearch(word, array, loose = false) {

        array = [...array];
        let r = false;
        array.some((a) => {
            if ((word.indexOf(a) >= 0 && loose && this.pos(a.length - word.length) <= 1) || (word === a)) {
                r = a; return true;
            }
        })
        return r;
    }
    //
    // Move chars backward/forward between array positions
    moveAround(arr, pos, char, direction) {

        const to = direction === "right" ? pos + 1 : pos - 1;
        const cutIndex = direction === "right" ? -1 : 1;
        // Cut char from current slot
        arr[pos] = direction === "right" ? arr[pos].slice(0, cutIndex) : arr[pos].slice(cutIndex);
        // Glue char to neighbor
        arr[to] = direction === "right" ? char + arr[to] : arr[to] + char;
        return arr;
    }

}

//
//
// Core methods extension
//
class coreFunctionsExt extends coreFunctions {

    constructor() { super(); }
    //
    // Given a word, return its V/C structure BUT annotating consonant type (PC, FC, etc.)
    getEstExt(word, returnType = "array") {

        let wordAsArray = word.split("");
        let r = super.getEst(word, returnType).map((est, index) => {

            if (est === "V") return "V";

            if (wordAsArray[index] === "c") {
                if (wordAsArray[index + 1] === "e" || wordAsArray[index + 1] === "i") return "FC";
                return "PC";
            }

            if (this.plosives.has(wordAsArray[index])) return [...this.plosives][0];
            if (this.fricatives.has(wordAsArray[index])) return [...this.fricatives][0];
            if (this.affricates.has(wordAsArray[index])) return [...this.affricates][0];
            if (this.nasals.has(wordAsArray[index])) return [...this.nasals][0];
            if (this.laterals.has(wordAsArray[index])) return [...this.laterals][0];
            if (this.approximants.has(wordAsArray[index])) return [...this.approximants][0];
            if (this.vibrants.has(wordAsArray[index])) return [...this.vibrants][0];

            return "C";
        });
        if (returnType !== "array") return r.join("");
        return r;
    }
    //
    // Validate first two letters (onset) against allowed clusters and exceptions
    isF2Valid(word) {

        let f2 = word.slice(0, 2)
        let f3 = word.slice(0, 3);
        let est = this.getEstExt(f2, "str");
        let estS = this.getEst(word, "string").slice(0, 2);
        let inValidStart = this.invalidStarts.has(f2);

        if (inValidStart)
            return false;

        // Early return for easy cases
        if (estS === "CV" || estS == "VC")
            return true;

        // If first 2 letters starts in forbiden chars or full word is a 2 chars forbiden type, then we return false
        if (f2 === "cc" || word === "ch" || word === "rr" || word === "ll")
            return false;

        // If first 2 chars are common spanish 2 letters formed sounds or know 3 chars exceptions, then we return true
        if (((f2 === "rr" || f2 === "ll" || f2 == "ch" || f2 === "ps") && word.length > 2) || f3 === "ciu" || f3 === "cie")
            return true;

        // Otherwise we  test the current sound patter to those allowed in spanish (for the firs 2C)
        return this.valid2CSounds.has(est);
    }

    //
    // Detects whether a syllable is misspelled or not based on first 2 consonants,
    // structure, last char type or general structure of the syllable
    isValidSyllable(syllable) {

        const syllableEst = this.getEst(syllable);
        const syllableEnding = syllable.slice(syllable.length - 1);
        const f2l = syllable.slice(0, 2);

        if (syllableEst === "C")
            return false;

        if (syllableEst === "V")
            return true;

        if (syllableEst.slice(0, 3) === "CCC")
            return false;

        let hasInvalidEnding = this.invalidSyllablesEndings.has(syllableEnding);
        let hasEndingExceps = this.invalidSyllablesEndingsExceptions.has(syllable.slice(length - 2));
        let is2fv = this.isF2Valid(syllable);

        if (!is2fv && !(syllableEst === "CV" || syllableEst === "VC" || syllableEst === "VCV" || syllableEst === "CVCV" || syllableEst === "CVC")
            || (hasInvalidEnding && !hasEndingExceps))
            return false;

        return is2fv;
    }
}

//
//
// Syllabifier class
//
class Syllabifier extends coreFunctionsExt {

    constructor() { super(); }

    SyllableHasValidEnding(lastLetterLastlastS, lastLastS) {

        if (this.forbiddenEnds.has(lastLetterLastlastS) && !this.forbiddenEndsExc.has(this.clean(lastLetterLastlastS)))
            return false;
        return true;
    }

    //
    // Heuristic rules to help the main loop split into syllables more accurately
    //
    rulesApply = (syllables) => {

        const lastS = syllables[syllables.length - 1];
        const lastLastS = syllables[syllables.length - 2] ?? false;

        if (!lastLastS) return syllables;

        const lastLetterLastlastS = lastLastS[lastLastS.length - 1];
        const lasSEst = this.getEst(lastS);
        const firstLastS = lastS.slice(0, 1);
        const firstLetLastEst = this.getEst(firstLastS)

        let conjuntion = lastLastS + lastS;

        // Sanity check: limit to last 3 chars
        if (conjuntion.length > 3) conjuntion = conjuntion.slice(-3);

        // If last syllable starts with invalid 2-consonant onset, fix it
        // Syllables with only 2 chars won't fit this rule
        if (lasSEst.slice(0, 2) === "CC" && !this.isF2Valid(lastS) && lasSEst.length > 2)
            this.moveAround(syllables, syllables.length - 1, firstLastS, "left");

        if (this.isTwoLettersSounds(lastS)) {
            syllables[syllables.length - 2] = syllables[syllables.length - 2] + lastS;
            syllables.pop();
            return syllables;
        }

        // No syllable can be a single consonant.
        // If last letter of previous syllable + first of current syllable form a diphthong, join them.
        if (lasSEst === "C" || (firstLetLastEst !== "C" && !!this.reverseSearch(conjuntion, this.diphthongsAndtriphthongs, true)))
            this.moveAround(syllables, syllables.length - 1, lastS, "left");

        // Final cleanup
        return syllables.filter((s) => s !== "");
    }

    //  
    // Heuristic syllable splitter
    //
    splitInSyllables(word) {

        let syllables = []; // Final syllables array; each element is one syllable
        let syllablesTmp = ""; // Temp buffer to store consonants between detected vowels
        let wordAsArray = word.split(""); // Word as an array of letters
        let wordAsEstArray = this.getEst(word, "array"); // V/C structure as an array

        // Add a letter to the temp buffer
        const tmpAdd = (currentLetter) => { syllablesTmp += currentLetter; }
        // Push temp buffer + current letter as a syllable; then reset buffer
        const tmpPush = (currentLetter) => { syllables.push(syllablesTmp + currentLetter); syllablesTmp = ""; }
        // At the end of the word, flush whatever is left in the temp buffer
        const emptyPush = () => tmpPush("");

        //
        // Main loop:
        // Iterate letters; accumulate consonants; on vowel, push syllable (buffer + vowel).
        // After each push, run rule-based post-processing (rulesApply).
        //
        const end = wordAsArray.length - 1;
        for (let index = 0; index <= end; index++) {

            const currentType = wordAsEstArray[index];
            const currentLetter = wordAsArray[index];

            if (currentType === "C") {

                tmpAdd(currentLetter);
                if (index === end) emptyPush();
                syllables.length > 0 ? syllables = this.rulesApply(syllables) : null;
                continue;
            }

            tmpPush(currentLetter);
            syllables = this.rulesApply(syllables);
        }
        return this.rulesApply(syllables);
    }

}

//
// Class extension to the main Syllabifyer class, focused on syllabifying
// misspelled words, using more complex heruistic rules
//
class magikEspellCheck extends Syllabifier {

    constructor() {
        super();
        this.dictionaryLoad(this.dictionaryUrl);
        // Avoid user's cold start; priming cache with an example word is optional
        this.splitInSyllables("produccionando");
    }


    //
    // Applies syllabification heuristics to a misspelled word in order to infer
    // where a vowel or a consonant should be inserted (or where a split occurs).
    //
    // Markers used by this routine (logical, not user-facing):
    //   - "$" : suggested boundary/placeholder typically indicating a missing VOWEL
    //           (e.g., a place where a vowel could be inserted or a syllable break
    //           around consonant clusters).
    //   - "#" : suggested boundary/placeholder typically indicating a missing
    //

    smartDivide(word) {

        let syllables = word;
        let syllablesC = syllables; // String copy to apply the consonant-oriented rules

        //
        // Helper: rules focused on VOWEL placement and consonant-cluster splits.

        const vowelsLogicApply = (chars, index) => {

            let cn1 = chars[index - 1] ?? false; // previous char
            const cn2 = chars[index - 2] ?? false; // char two positions back

            let c0 = chars[index] ?? "";           // current char
            let currentEst = this.getEst(c0);             // current char simple Est 

            const c1 = chars[index + 1] ?? false;  // next char
            const c2 = chars[index + 2] ?? false;  // char two positions ahead

            const is2FV = this.isF2Valid(cn1 + c0);           // valid CC onset/coda
            const i2ls = this.isTwoLettersSounds(cn1 + c0);     // mandatory digraph

            // Need sufficient left/right context to apply most rules
            if (!cn2)
                return chars;

            const twoPrevCharsEst = this.getEst(cn2 + cn1); // To prev chars Est
            const inmediatePrevEst = this.getEst(cn1 + c0); // las char + current Est

            // If we reach the last char and last char isn't an S and prev char is a (C)
            // We add a vowel 
            if (!c1 && inmediatePrevEst === "CC" && c0 !== "s")
                return this.replaceCharAt(chars, index, "$");

            // If previous + current form a mandatory digraph (ll , rr,ch ...)
            // we add a vowel rigth after digraph's end 
            if (i2ls)
                return this.replaceCharAt(chars, index + 1, "$");

            // If current char is not a vowel and the pattern around it forms a valid
            // type => (cn1 + "$" + c1)  we add $ to current index
            // Exceptions: valid First 2 chars combo, digraphs,invalid starts for (CV) & probable dipthongs

            if (currentEst == "C" && this.isValidSyllable(cn1 + "$" + c1) &&
                inmediatePrevEst == "CC" && twoPrevCharsEst == "CC" && !is2FV)
                return this.replaceCharAt(chars, index, "$");

            if (!cn1)
                return chars;

            // If we detect a heavy cluster "VCCC" (likely needing a sustitution), and the
            // immediate two-letter cluster is not a valid  2 FIRST LETTERS set, we replace $ at index
            if (this.getEst(cn2 + cn1 + c0 + c1) === "VCCC" && !is2FV)
                return this.replaceCharAt(chars, index, "$");

            // If the two chars to the left form a valid CC and current is a vowel,
            // prefer placing the split AFTER the vowel (index+1) to preserve the valid CC onset/coda.
            if (this.isF2Valid(cn2 + cn1) && twoPrevCharsEst === "CC" && currentEst === "V")
                return this.replaceCharAt(chars, index + 1, "$");



            return chars;
        }


        //
        // Helper: rules focused on CONSONANT placement and VV splitting.
        // 

        const consonantsLogicApply = (chars, index) => {

            const cn1 = chars[index - 1] ?? false; // previous char (for digraph checks)
            const cn2 = chars[index - 2] ?? false; // two back (context)

            let c0 = chars[index] ?? "";           // current char
            const c1 = chars[index + 1] ?? false;  // next char
            const c2 = chars[index + 2] ?? false;  // two ahead (to detect "VVV")

            // If we have "VV" at (c0,c1), it's NOT a known diphthong on either side,
            // and the lookahead is not making it "VVV", then mark "#" at index to
            // suggest a consonant insertion / split between the two vowels.

            if (this.getEst(c0 + c1) === "VV" && !this.diphthongsAndtriphthongs.has(c0 + c1) &&
                !this.diphthongsAndtriphthongs.has(cn1 + c0) && this.getEst(c0 + c1 + c2) !== "VVV") {
                chars = this.replaceCharAt(chars, index, "#");
            }

            return chars;
        }

        //
        // Main loop:
        //   Apply the two complementary heuristics in parallel tracks:
        //     - 'syllables'  : vowel-placement / consonant-cluster splits ("$")
        //     - 'syllablesC' : consonant-placement / VV splitting ("#")

        for (let index = 0; index < syllables.length; index++) {

            syllables = vowelsLogicApply(syllables, index);
            syllablesC = consonantsLogicApply(syllablesC, index);

        }
        return [...new Set([syllables, syllablesC])];
    }


    //
    //
    prepareDict() {

        this.dictData = this.dictData.split(",");
        this.dictData[this.dictData.length - 1] = this.dictData.at(-1).replace("'", "").trim();
        this.dictData[0] = this.dictData[0].replace("'", "").trim();

        this.dictData.forEach((word) => {

            const f2c = word.slice(0, 2);
            const fw = f2c.slice(0, 1);
            const wl = word.length;

            // If first level (a, b ,c ... [first letter]) is undef for this word, we make it
            if (!this.dictMapped.has(`${fw}`))
                this.dictMapped.set(`${fw}`, new Map());

            // If second level for this word (ab, ac, ad... [first 2 letters]) is also undef we made it
            if (!this.dictMapped.get(`${fw}`).has(`${f2c}`))
                this.dictMapped.get(`${fw}`).set(`${f2c}`, new Map())

            // If third level for this word (1,2,3... [word length]) is also undef we made it
            // last level is a set for faster search
            if (!this.dictMapped.get(`${fw}`).get(`${f2c}`).has(`${wl}`))
                this.dictMapped.get(`${fw}`).get(`${f2c}`).set(`${wl}`, new Set());

            // Storing word in set...
            this.dictMapped.get(`${fw}`).get(`${f2c}`).get(`${wl}`).add(word);


        })
        console.log("Dictionary fully loaded");
    }

    //
    //
    getSet(word) {

        const f2c = word.slice(0, 2);
        const fw = f2c.slice(0, 1);
        const wl = word.length;

        if (!this.dictMapped.get(`${fw}`).has(`${f2c}`) || !this.dictMapped.get(`${fw}`).get(`${f2c}`).has(`${wl}`))
            return false;

        return this.dictMapped.get(`${fw}`).get(`${f2c}`).get(`${wl}`);

    }

    //
    //
    check(word, onlyCheckSyllables = false) {

        //This checks each syllables estructure 
        if (onlyCheckSyllables) {
            let r = this.splitInSyllables(word).some((s) => !this.isValidSyllable(s));
            return !r;
        }

        let set = this.getSet(word);
        if (!set || !set.has(word))
            return false;

        return true;
    }

    //
    //
    variationsMerge(matrix) {

        return matrix.reduce(
            (acc, group) => acc.flatMap(prefix => group.map(syll => prefix + syll)),
            ['']
        );
    }

    //
    //
    groupWords(arr) {

        return arr
            .sort((a, b) => a.length - b.length || a.localeCompare(b))
            .reduce((groups, word) => {
                const key = word.slice(0, 2) + "_" + word.length;
                let group = groups.find(g => g.key === key);
                if (!group) {
                    group = { key, words: [] };
                    groups.push(group);
                }
                group.words.push(word);
                return groups;
            }, [])
            .map(g => g.words);
    }

    //
    //
    variationsMerge(arr) {

        if (arr[0].length === 0) return undefined;

        return arr.reduce(
            (acc, group) => acc.flatMap(prefix => group.map(syll => prefix + syll)),
            [""]
        );
    }

    //
    //
    singleCharReplace = (syllable, index, syllablesComb) => {

        //Generating combinations removing a letter at a time
        this.isValidSyllable(syllable.slice(0, index + 1) + syllable.slice(index + 2))
            ? syllablesComb.push(syllable.slice(0, index + 1) + syllable.slice(index + 2)) : null;

        //... Adding placeholder for wovels a letter at a time
        this.isValidSyllable(this.insertChar(syllable, index, "$"))
            ? syllablesComb.push(this.insertChar(syllable, index, "$")) : null;

        //... Adding placeholder for consontants a letter at a time
        this.isValidSyllable(syllable, index, "#")
            ? syllablesComb.push(this.insertChar(syllable, index, "#")) : null;

    }
    //
    doubleCharReplace = (syllable, index, syllablesComb) => {

        if (syllable.slice(index + 1) == "")
            return;

        //Generating combinations by adding 2 consonants placeholders at a time, with a char long of diff
        let test = this.insertChar(syllable, index, "#"); test = this.insertChar(test, index + 2, "#");
        this.isValidSyllable(test) ? syllablesComb.push(test) : null;

        //Generating combinations by adding 2 vowels placeholders at a time, with a char long of diff
        test = this.insertChar(syllable, index, "$"); test = this.insertChar(test, index + 2, "$");
        this.isValidSyllable(test) ? syllablesComb.push(test) : null;

        //Generating combinations by adding a placeholder ($) and removing a char
        test = this.insertChar(syllable, index, "$"); test = this.replaceCharAt(test, index + 2, "");
        this.isValidSyllable(test) ? syllablesComb.push(test) : null;

    }

    //
    //
    generateCandidates(word, skipFalse = false) {

        let candidates = [];

        const testPatterns = (syllable) => {

            if (this.isValidSyllable(syllable) && !skipFalse) return [syllable];
            let syllablesComb = [];

            for (let index = 0; index < syllable.length; index++) {

                this.singleCharReplace(syllable, index, syllablesComb);
                this.doubleCharReplace(syllable, index, syllablesComb);

            }
            return syllablesComb;
        }

        let smartD = this.smartDivide(word);

        smartD.forEach((smartCand) => { this.check(smartCand, true) ? candidates.push(smartCand) : null })
        smartD = smartD.filter((c) => !candidates.includes(c))

        smartD = smartD.map((c) => {

            let syllables = this.splitInSyllables(c);
            syllables = syllables.map((s) => testPatterns(s));
            let vm = this.variationsMerge(syllables);

            return vm.filter((s) => this.check(s, true));
        })
        console.log(smartD)
        smartD.filter((a) => a !== undefined).forEach((a) => { a.forEach((b) => { candidates.push(b); }) });
        return candidates;
    }

    //
    //
    generateCandidatesLoop(word) {

        let cont = 0, suggestions = [];
        let candidates = this.generateCandidates(word);
        suggestions = this.generateSuggestions(candidates)

        if (suggestions.length > 0)
            return suggestions;

        while (suggestions.length === 0 && cont < this.epochs) {


            let skipFalse = cont < 1 ? false : true;
            let toLoop = [...candidates]; candidates = [];

            toLoop.some((_word) => {

                let _candidates = this.generateCandidates(_word);
                suggestions = this.generateSuggestions(_candidates)

                if (suggestions.length > 0)
                    return true;

                candidates = [...candidates, ..._candidates]
            })

            console.log("========")
            console.log(candidates.join(" , "))
            cont++;
        }
        return suggestions;
    }

    //
    //
    generateSuggestions(candidates) {

        console.log("==> " + candidates)
        let finalCandidates = [], _candidatesGrouped, _candidates = [];
        const vowels = ["a", "e", "i", "o", "u"];
        const consonants = [
            "b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "ñ",
            "p", "q", "r", "s", "t", "v", "w", "x", "y", "z"
        ];

        //const regex = new RegExp(candidate.replace(/\$/g, this.vowels));
        candidates.forEach((candidate) => {

            if (candidate[1] === "$") {
                vowels.forEach((v, i) => { _candidates.push(this.replaceCharAt(candidate, 1, v)) });
                return;
            }
            if (!candidate.slice(0, 2).includes("#") && !candidate.slice(0, 2).includes("$"))
                _candidates.push(candidate);

            consonants.forEach((c, i) => { _candidates.push(this.replaceCharAt(candidate, 1, c)) });
        })

        _candidates.forEach((a) => { this.check(a) ? finalCandidates.push(a) : null })
        _candidates = _candidates.filter((c) => !finalCandidates.includes(c) && this.check(c, true));


        console.log("==== candidates===")
        console.log(_candidates);

        _candidatesGrouped = this.groupWords(_candidates);

        console.log("==== grouped candidates===")
        console.log(_candidatesGrouped);

        _candidatesGrouped.forEach((candidateGroup, gIndex) => {

            let isSet = this.getSet(candidateGroup[0]);
            console.log("set => " + candidateGroup[0] + " => " + isSet)
            if (!isSet) return;

            let groupSet = [...isSet];

            candidateGroup.forEach((candidate) => {

                console.log(candidate);
                if (candidate.indexOf("#") < 0 && candidate.indexOf("$") < 0)
                    return;

                if (candidate.indexOf("$") >= 0) {
                    const regex = new RegExp(candidate.replaceAll(/\$/g, `[${vowels.join("")}]`));
                    console.log(regex)
                    groupSet.forEach((word) => { regex.test(word) ? finalCandidates.push(word) : null; })
                }

                if (candidate.indexOf("#") < 0)
                    return;

                const regex = new RegExp(candidate.replaceAll(/\$/g, `[${consonants.join("")}]`));
                groupSet.forEach((word) => { regex.test(word) ? finalCandidates.push(word) : null; })

            })
        })

        return finalCandidates;
    }

    //
    //
    correct(word = word.toLowerCase(), start = performance.now()) {

        if (this.check(word)) { this.printTime(start); return true; }

        let suggestions = this.generateCandidatesLoop(word);
        console.log(suggestions);
        this.printTime(start, "TIEMPO DE EJEC (EN SEGS) ", 4);
    }

}

const spell = new magikEspellCheck();
