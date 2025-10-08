// Heuristic Spell Corrector for spanish language
// Copyright (c) 2025 José Alejandro Palomo González
//
// Permission is hereby granted, free of charge, to any person 
// obtaining a copy of this software and associated documentation 
// files (the "Software"), to use, copy, modify, merge, publish, 
// and distribute the Software, subject to the following conditions:
//
// 1. This copyright notice and permission notice shall be included 
//    in all copies or substantial portions of the Software.
//
// 2. Proper credit must always be given to the author of the Software.
//
// 3. The Software may be used for personal, educational, research, 
//    or commercial purposes, including integration into larger works 
//    or products, provided that:
//
//      - The Software is not sold, licensed, or redistributed as a 
//        standalone paid product.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. 
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY 
// CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, 
// TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE 
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.




// Core utility methods
class coreMethods {


    dictionaryUrl = "https://raw.githubusercontent.com/prometheusCo/spellMagik/refs/heads/main/dictionaryC.txt";

    dictData; dictMapped = new Map();

    epochs = 3;

    stringDiff = 0.7;

    // Vowels used to better clasification
    weakVowels = ['i', 'u'];
    strongVowels = ['a', 'e', 'o']

    vowels = new Set([...this.weakVowels, ...this.strongVowels, ...["$"]]);

    // Consonants types  used for ruling out of syllables
    plosives = new Set(["PC", "p", "t", "k", "b", "d", "g", "#"]);
    fricatives = new Set(["FC", "f", "s", "j", "z", "#"]);
    affricates = new Set(["AFC", "ch", "#"]);
    nasals = new Set(["NC", "m", "n", "ñ", "#"]);
    laterals = new Set(["LC", "l", "ll", "#"]);
    approximants = new Set(["AC", "b", "x", "#"]);
    vibrants = new Set(["BC", "r", "rr", "#"]);


    // Used to rule in valid vocals joins
    diphthongsAndtriphthongs = [
        "ia", "ie", "io", 'uei',
        "ua", "ue", "uo", "ió",
        "ai", "ei", "oi",
        "au", "eu", "ou",
        "iu", "ui", "ai",
        "üi", "üe", "üa",
        "üé", "uí", "üí"
    ];


    // Valid two-consonant ONSET clusters by consonant (sound) TYPE
    valid2CSounds = new Set([

        "PCLC", // pl, bl, cl, gl
        "PCBC", // pr, br, tr, dr, cr, gr
        "FCBC", // fr
        "FCLC"
    ]);

    //
    twoLettersSounds = new Set(["rr", "ll", "ch"]);

    // Used to determine if a syllable is misspelled by looking at it's ending letters
    invalidSyllablesEndings = new Set(["k", "g", "c", "x", "f", "d", "v", "gn"]);

    // Used to determine if a syllable is misspelled by looking at it's ending letters
    invalidSyllables2Endings = new Set(["vl"]);

    // Letter that form an exception to list above
    invalidSyllablesEndingsExceptions = new Set(["ac", "oc", "ec", "ic", "ag", "ex", "ed"]);

    // Invalid word's starts that makes a syllable be considered misspelled
    invalidStarts = new Set(["ki", "qi", "vr", "ko", "st", "rv"]);

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
    hasSymbols = str => new RegExp(/[$|#]/).test(str);
    count = (arr, str) => [...arr].filter((a) => a.indexOf(str) >= 0).length

    //
    //

    //
    //
    hasValidEnding(str) {

        if (this.invalidSyllables2Endings.has(str.slice(-2)))
            return false;

        if (this.invalidSyllablesEndingsExceptions.has(str.slice(-2)) || !this.invalidSyllablesEndings.has(str.slice(-1)))
            return true;

        return false;
    }


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
//

class coreMethodsExt extends coreMethods {

    constructor() {
        super();
    }
    //
    // Given a word, return its V/C structure BUT annotating consonant type (PC, FC, etc.)
    getEstExt(word, returnType = "array") {

        if (!this.isValid(word)) return "NN"

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

        if (this.getEst(syllable.slice(0, 3)) === "VVV" && !this.reverseSearch(syllable, this.diphthongsAndtriphthongs))
            return false;

        if (syllableEst.slice(0, 3) === "CCC")
            return false;

        let hasInvalidEnding = !this.hasValidEnding(syllable)
        let is2fv = this.isF2Valid(syllable);

        if (!!this.reverseSearch(syllable, this.diphthongsAndtriphthongs, true) && (syllableEst === "CVV" || syllableEst === "VVC"))
            return true;

        if (!is2fv && !(syllableEst === "CV" || syllableEst === "VC" || syllableEst === "VCV" || syllableEst === "CVCV" || syllableEst === "CVC")
            || (hasInvalidEnding))
            return false;

        return is2fv;
    }
}

//
//
// Syllabifier class
//
//

class Syllabifier extends coreMethodsExt {

    constructor() { super(); }

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
        return typeof syllables === "object" ? syllables.filter((s) => s !== "") : syllables;
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
//
// Main spell checker class
//
//

class magikEspellCheck extends Syllabifier {

    constructor() {

        super();
        this.dictionaryLoad(this.dictionaryUrl);
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
                this.dictMapped.get(`${fw}`).set(`${f2c}`, new Set())

            // Storing word in set...
            this.dictMapped.get(`${fw}`).get(`${f2c}`).add(word);

        })

        console.log("Dictionary fully loaded");
    }

    //
    //
    getSet(word) {

        const f2c = word.slice(0, 2);
        const fw = f2c.slice(0, 1);
        const wl = word.length;

        if (!this.isF2Valid(f2c))
            return false;

        if (!this.dictMapped.get(`${fw}`) || !this.dictMapped.get(`${fw}`).has(`${f2c}`))
            return false;

        return this.dictMapped.get(`${fw}`).get(`${f2c}`);

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
    check(word, onlyCheckSyllables = false) {

        //This checks each syllables estructure 

        if (!this.isValid(word))
            return false;

        if (onlyCheckSyllables) {

            let ogS = new Syllabifier();
            if (typeof word === "string") word = ogS.splitInSyllables(word);

            for (let index = 0; index < word.length; index++) {

                let s = word[index];
                if (!this.isValidSyllable(s))
                    return false;

            }
            return true;
        }

        let set = this.getSet(word);
        if (!set || !set.has(word))
            return false;

        return true;
    }

    //
    //
    advancedRulesAplly(_syllable) {

        let syllable = _syllable;
        let V2F = this.isF2Valid(syllable),
            F3C = syllable.slice(0, 3),
            prevInsert = V2F ? syllable[0] : syllable[1],
            makeTest = prev => this.replaceCharAt(syllable, 1, prev + "$"),
            exp = /[#|$]/;

        // If the first three characters are consonants and the test  syllable (CVC) is valid
        // Change syllable to test pattern
        if (this.getEst(F3C) === "CCC" && this.isValidSyllable(makeTest(prevInsert)))
            return makeTest(prevInsert);

        // If AROUND current pos a CCV pattern is form and CC comb it's not valid 
        // we sustitute current char for VOWEL PATTERN (CVVC)
        let test = syllable[0] + "$" + syllable[1] + syllable[2];
        if (this.getEst(syllable) === "CCV" && !V2F && this.isValidSyllable(test) && syllable[1] !== "$")
            return test;


        // IF CC COMB IS INVALID and only 2 chars EXIST...
        if (this.getEst(syllable) == "CC" && !V2F)
            return syllable[0] + "$" + syllable[1];

        // IF ENDING IS INVALID...
        if (!this.hasValidEnding(syllable) && this.getEst(syllable.slice(0, 2)))
            return syllable + "$"


        // IF CC COMB IS INVALID AND 3 OR MORE CHAR EXIST
        if (!V2F)
            return this.insertChar(syllable, 0, "$")

        // IF CC COMB IS INVALID AND 3 OR MORE CHAR EXIST
        if (V2F)
            return this.insertChar(syllable, 1, "$")

        return syllable;
    }

    //
    //
    cutUntilTrue(word) {

        if (typeof word == "object") {

            if (word.length > 1) return word;
            word = word[0];
        }

        for (let index = 0; index < word.length; index++) {

            let test = word.slice(index);

            if (this.isValidSyllable(test))
                return [word.slice(0, index), test]
        }

        let cut = Math.round(word.length / 2)
        return [word.slice(0, cut), word.slice(cut)];

    }

    //
    //
    splitInSyllables(_syllables) {

        let syllables = this.cutUntilTrue(super.splitInSyllables(_syllables));
        let ogSyllabifier = new Syllabifier();
        let epochs = 0, hasValidSyllables = false;

        if (this.check(syllables, true))
            return syllables;

        while (epochs < this.epochs && !hasValidSyllables) {

            [...syllables].forEach((s, index) => {

                if (this.isValidSyllable(s))
                    return;

                s = this.advancedRulesAplly(s);
                if (this.isValidSyllable(s)) {
                    syllables[index] = s; return;
                }
            })

            if (this.check(syllables.join(""), true))
                hasValidSyllables = true;

            syllables = ogSyllabifier.splitInSyllables(syllables.join(""))
            epochs++;
        }
        return syllables;
    }

    //
    //
    returnSuggestions(patterns, ogWord) {

        //console.log(patterns)
        let sugestions = [];
        patterns.forEach((pattern) => {

            let set = this.getSet(pattern.slice(0, 2));
            if (!set) return;
            let reg = new RegExp(pattern, "i")
            let pool = [...set];
            let ln = (pattern.split("[a-z]{").join("").length - 2) + parseInt(pattern.split("{")[1].split("}")[0]);

            pool.forEach((w) => {

                if (w.length !== ln || !reg.test(w) || spell.diffScoreStrings(ogWord, w) < this.stringDiff)
                    return;

                sugestions.push([w, spell.diffScoreStrings(ogWord, w)]);
            })

        })

        return sugestions.sort((a, b) => b[1] - a[1]);
    }

    //
    //
    generateMutations(word) {

        let candidate = this.splitInSyllables(word);
        let F2C = candidate.join("").slice(0, 2);
        let finalCandidates = [];

        let start = [F2C], middle = candidate.join(""), end = candidate.at(-1).slice(-1);
        const vowels = this.vowels;
        const consonants = [
            'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
            'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'
        ]

        // STARTS IN V
        if (this.isValidSyllable("$" + start[0][0])) {
            vowels.forEach((l) => { start.push(l + start[0][0]) });
        }

        // STARTS  WITH SWAPPED LETTERS
        if (this.isValidSyllable(F2C[1] + F2C[0])) {
            start.push(F2C[1] + F2C[0]);
        }

        // WORD'S START VRS IF ANY
        if (/[$|#]/.test(F2C)) {

            F2C.indexOf("$") >= 0 ? vowels.forEach((l) => { start.push(F2C.replace("$", l)) })
                : consonants.forEach((l) => { start.push(F2C.replace("#", l)) });
        }

        // PATTERN END
        if (end.search(/[$|#]/) >= 0)
            end = end.slice(end.search(/[$|#]/))

        // PATTER MIDDLE
        middle = middle.slice(2, -(end.length))

        // GENERATING FINAL MUTATIONS TO TEST AGAINST CLUSTER
        start.forEach((st) => {

            let n = middle.length;
            for (let index = -1; index < 1; index++) {

                let expReg = `${st}[a-z]{${(n + index)}}${end}`;
                if (/[$|#]/.test(st))
                    continue;

                finalCandidates.push(expReg);
            }

        })
        return finalCandidates;
    }

    //
    //
    correct(word, start = performance.now()) {

        word = word.toLowerCase();

        if (this.check(word))
            return true;

        let mutations = this.groupWords([this.generateMutations(word)]);
        let suggestions = this.returnSuggestions(mutations[0][0], word);

        console.log(suggestions)
        this.printTime(start, " EXEC TIME", 10);
    }

}

const spell = new magikEspellCheck();
