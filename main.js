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

    dictData; dictMapped = new Map();

    //
    //  CONF ZONE
    //  Remote dictionary (comma-separated tokens; optionally gzip-compressed)
    dictionaryUrl = "https://raw.githubusercontent.com/prometheusCo/spellMagik/refs/heads/main/Dicts/Es/dictionary.txt";

    //  Max refinement passes when spliting in syllables
    epochs = 3;

    //  Minimum similarity to accept suggestion (0–1). Higher => stricter
    stringDiff = 0.7;

    /* String diff tolerance for especial cases ( swaped initial letters for exam)
    =====> */  diffTolerance = 0.15;

    //  Cap on suggestions returned
    maxNumSuggestions = 10;

    //  Warm-up run to avoid first-call latency
    warmStart = true;

    //  Wildcard tokens used INSIDE candidate patterns:
    //  vowelsWildcard => matches any vowel; consonantssWildcard => any consonant
    vowelsWildcard = "§";
    consonantssWildcard = "~";

    //
    // Vowels used for syllabification and others checks (Spanish-centric)
    weakVowels = ['i', 'u'];
    strongVowels = ['a', 'e', 'o']

    // Set used by classification helpers
    vowels = new Set([...this.weakVowels, ...this.strongVowels, ...[this.vowelsWildcard]]);

    // Consonant classes (sound types) used to validate onsets/clusters
    plosives = new Set(["PC", "p", "t", "k", "b", "d", "g", this.consonantssWildcard]);
    fricatives = new Set(["FC", "f", "s", "j", "z", this.consonantssWildcard]);
    affricates = new Set(["AFC", "ch", this.consonantssWildcard]);
    nasals = new Set(["NC", "m", "n", "ñ", this.consonantssWildcard]);
    laterals = new Set(["LC", "l", "ll", this.consonantssWildcard]);
    approximants = new Set(["AC", "b", "x", this.consonantssWildcard]);
    vibrants = new Set(["BC", "r", "rr", this.consonantssWildcard]);


    // correct two-consonant onset clusters by consonant TYPE (encoded)
    // Example: "PCLC" means a plosive followed by a lateral (pl, bl, cl, gl)
    valid2CSounds = new Set([

        "PCLC", // pl, bl, cl, gl
        "PCBC", // pr, br, tr, dr, cr, gr
        "FCBC", // fr
        "FCLC"
    ]);

    //
    // Digraphs that function as single sounds
    twoLettersSounds = new Set(["rr", "ll", "ch"]);

    // Heuristics to reject clearly illegal syllable endings
    invalidSyllablesEndings = new Set(["k", "g", "c", "x", "f", "d", "v", "gn"]);

    // Secondary endings blacklist (more specific)
    invalidSyllables2Endings = new Set(["vl"]);

    // Exceptions that keep some endings correct despite blacklist above
    invalidSyllablesEndingsExceptions = new Set(["ac", "oc", "ec", "ic", "ag", "ex", "ed"]);

    // Illegal word starts that instantly mark a syllable split as invalid
    invalidStarts = new Set(["ki", "qi", "vr", "ko", "st", "rv"]);

    // Suspicious starts: not an outright error, but trigger extra mutation attempts
    suspiciousStarts = new Set(["w", "k"]);

    // Cache to avoid duplicate candidates during suggestion expansion
    noiseCache = new Set([]);

    // Invalid syllabes false positives
    invalidSyllablesFalseP = new Set(["au"])

    // Flag set when dictionary is ready
    ready = false;

    //
    // Simple one-liner helpers
    //


    // Absolute value (micro-helper)
    pos = n => n < 0 ? n * (-1) : n;
    // Guard against nullish/empty
    isValid = val => val !== undefined && val !== "" && val !== null && val !== "undefined";
    // Replace char at index
    replaceCharAt = (str, pos, char) => str.slice(0, pos) + char + str.slice(pos + 1);
    // Split array in two parts at index
    splitArrayAt = (arr, pos) => [arr.slice(0, pos), arr.slice(pos)];
    // Insert char AFTER position x
    insertChar = (y, x, c) => y.slice(0, x + 1) + c + y.slice(x + 1);
    // Check if two-letter token is a Spanish digraph
    isTwoLettersSounds = ll => this.twoLettersSounds.has(ll);
    // Detect wildcard tokens in a string
    hasSymbols = str => new RegExp(/[§|~]/).test(str);
    // Count items containing substring
    count = (arr, str) => [...arr].filter((a) => a.indexOf(str) >= 0).length
    // Is an string an inverted version of another???
    isInverted = (a, b) => a.split("").reverse().join("") == b
    //
    normalize = s => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, (m, i, a) => (m === '\u0303' && /[nN]/.test(a[i - 1])) ? m : '').normalize('NFC') : s;
    //
    _null = a => a;


    //
    // Validate syllable ending using primary/secondary blacklists + exceptions
    hasValidEnding(str) {

        if (this.invalidSyllables2Endings.has(str.slice(-2)))
            return false;

        if (this.invalidSyllablesEndingsExceptions.has(str.slice(-2)) || !this.invalidSyllablesEndings.has(str.slice(-1)))
            return true;

        return false;
    }

    //
    // Load dictionary into memory, supporting plain text, base64, or gzip (browser-native DecompressionStream)
    // Persists raw string in localStorage to avoid refetching across sessions.
    dictionaryLoad(url) {

        const loadedData = localStorage.getItem("magikEspellCheckDict");
        if (this.isValid(loadedData)) { this.dictData = loadedData; this.prepareDict(); return; }

        const ok = r => (r.ok ? r : Promise.reject(new Error(`Failed: ${r.status} ${r.statusText}`)));
        const set = t => (this.dictData = t, t && this.prepareDict());

        // Heuristic base64 detector (length%4 + charset)
        const isB64 = s => /^[A-Za-z0-9+/=\s]+$/.test(s) && (s.replace(/\s+/g, "").length % 4 === 0);
        // decode base64 into bytes
        const fromB64 = s => {
            const bin = atob(s.replace(/\s+/g, ""));
            const out = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
            return out;
        };
        // treat input as raw binary string
        const fromBin = s => {
            const out = new Uint8Array(s.length);
            for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 255;
            return out;
        };

        const toBytes = s => (isB64(s) ? fromB64(s) : fromBin(s));
        const isGzip = bytes => bytes && bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
        const gunzip = bytes => {
            const ds = new DecompressionStream("gzip");
            const stream = new Response(bytes).body.pipeThrough(ds);
            return new Response(stream).text();
        };

        return fetch(url)
            .then(ok)
            .then(r => r.text())
            .then(s => {
                const bytes = toBytes(s);
                return isGzip(bytes) ? gunzip(bytes) : s; // Skip gunzip if not compressed
            })
            .then(set);
    }

    //
    //
    isValidVowelCluster(str) {

        if (/[gqc]üi|[gqc]uí|üí/giu.test(str))
            return true;

        const regex = /§?(?:[iuü][aeoáéó]|[aeoáéó][iuü]|[iuü]{2}|[iuü][aeoáéó][iuü]|[aeoáéó]y\b|[iuü]y\b|[iuü][aeoáéó]y\b)§?/iu;
        return regex.test(str);

    }

    //
    // Litle  helper to measure code exec time
    // Use around hot paths to observe wall time in seconds
    // declare end = performance.now() at begining of flow and printTime at end
    printTime(start, msg = "miScript:", fixed = 2) {

        const end = performance.now();
        const seconds = (end - start) / 1000;
        console.log(msg, seconds.toFixed(fixed), " segs");
    }

    //
    // Given a word, return its V/C structure (e.g., "VCVCC").
    // returnType:
    //   - "string" => "VCVC"
    //   - "array"  => ["V","C","V","C"]
    getEst(word, returnType = "string") {

        if (!this.isValid(word)) return "";
        let r = word.split("").map((a) => this.vowels.has(a) ? "V" : "C");
        if (returnType === "string")
            return r.join("");

        return r;
    }
    //
    //

    // Weighted Levenshtein-like similarity with vowel/consonant wildcards.
    // Returns a score in ~[0.1, 0.99]; higher means more similar.
    diffScoreStrings = (a, b, weights = { ins: 0.7, del: 1.3, sub: 1.0 }) => {

        const vowels = 'aeiouAEIOU';
        const isVowel = c => vowels.includes(c);
        const isConsonant = c => /^[b-df-hj-np-tv-z]$/i.test(c);
        const eq = (x, y) => (
            x === y ? true :
                (x === this.vowelsWildcard && isVowel(y)) || (y === this.vowelsWildcard && isVowel(x)) ? true :
                    (x === this.consonantssWildcard && isConsonant(y)) || (y === this.consonantssWildcard && isConsonant(x))
        );

        const m = a.length;
        const n = b.length;
        const [s, t] = m < n ? [a, b] : [b, a];
        const rows = s.length + 1;
        const cols = t.length + 1;

        let prev = new Float32Array(cols);
        let curr = new Float32Array(cols);

        for (let j = 0; j < cols; j++) prev[j] = j * weights.ins;

        for (let i = 1; i < rows; i++) {
            curr[0] = i * weights.del;
            const si = s[i - 1];
            for (let j = 1; j < cols; j++) {
                const tj = t[j - 1];
                const cost = eq(si, tj) ? 0 : weights.sub;
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

        return 0.1 + similarity * 0.89; // scaled 0.1–0.99
    };


    //
    // Move single character across syllable boundaries, merging into neighbor.
    // direction: "right" => transfer last char to the next slot; "left" => transfer first char to prev slot.
    moveAround(arr, pos, char, direction) {

        const to = direction === "right" ? pos + 1 : pos - 1;
        const cutIndex = direction === "right" ? -1 : 1;
        // Cut char from current slot
        arr[pos] = direction === "right" ? arr[pos].slice(0, cutIndex) : arr[pos].slice(cutIndex);
        // Glue char to neighbor
        arr[to] = direction === "right" ? char + arr[to] : arr[to] + char;
        return arr;
    }

    //
    // Checjk if a normalized word must be accented, if is the case
    // return the rigth version, used at the end of the pipeline
    addAccents(word) {


        return word;
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
    // For consonants: maps to the first element of each class Set (e.g., "PC","FC"...).
    // Useful to validate correct onsets like pl, br, fr...
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
    // Validate first two letters (onset) against allowed clusters and exceptions.
    // Rejects early for disallowed starts (e.g., "st", "rv") and special-case digraphs.
    isF2Valid(word) {

        let f2 = word.slice(0, 2)
        let f3 = word.slice(0, 3);
        let est = this.getEstExt(f2, "str");
        let estS = this.getEst(word, "string").slice(0, 2);
        let inValidStart = this.invalidStarts.has(f2);

        if (inValidStart)
            return false;

        // Early return for easy cases: CV or VC is always ok for the first two slots
        if (estS === "CV" || estS == "VC")
            return true;

        // If first 2 letters starts in forbiden chars or full word is a 2 chars forbiden type, then we return false
        if (f2 === "cc" || word === "ch" || word === "rr" || word === "ll")
            return false;

        // If first 2 chars are common spanish 2 letters formed sounds or know 3 chars exceptions, then we return true
        if (((f2 === "rr" || f2 === "ll" || f2 == "ch" || f2 === "ps") && word.length > 2) || f3 === "ciu" || f3 === "cie")
            return true;

        // Otherwise, test cluster type against the correct 2C onset patterns
        return this.valid2CSounds.has(est);
    }

    //
    // Determine whether a syllable is correct.
    // Uses structure (V/C), diphthong/triphthong membership, onset legality, and ending checks.
    isValidSyllable(syllable) {

        const f2l = syllable.slice(0, 2);
        const f3l = syllable.slice(0, 3);
        const syllableEst = this.getEst(syllable);
        const syllableEstF3 = syllableEst.slice(0, 3);
        const isValidf3c = this.isValidVowelCluster(f3l);

        const hasVVV = /VVV/.test(syllableEst);

        if (syllableEst === "C")
            return false;

        if (syllableEst === "V")
            return true;

        if (this.invalidSyllablesFalseP.has(syllable))
            return true;

        if (hasVVV && !isValidf3c)
            return false;

        if (syllableEstF3 === "CCC")
            return false;

        let hasInvalidEnding = !this.hasValidEnding(syllable)
        let is2fv = this.isF2Valid(syllable);

        if (!is2fv && !(syllableEst === "CV" || syllableEst === "VC" || syllableEst === "VCV" || syllableEst === "CVCV" ||
            syllableEst === "CVC") || (hasInvalidEnding))
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
    // Operates on the last two syllables only (local repair) to avoid over-merging.
    //
    rulesApply = (syllables) => {

        const ogSyllables = [...syllables].join("");
        const lastS = syllables[syllables.length - 1];
        const lastLastS = syllables[syllables.length - 2] ?? false;

        if (!lastLastS) return syllables;

        const lasSEst = this.getEst(lastS);
        const firstLastS = lastS.slice(0, 1);
        const firstLetLastEst = this.getEst(firstLastS)

        let conjuntion = lastLastS + lastS;

        // Sanity check: limit to last 3 chars
        if (conjuntion.length > 3) conjuntion = conjuntion.slice(-3);

        // If last syllable starts with invalid 2-consonant onset, move one char left
        // Syllables with only 2 chars won't fit this rule
        if (lasSEst.slice(0, 2) === "CC" && !this.isF2Valid(lastS) && lasSEst.length > 2)
            this.moveAround(syllables, syllables.length - 1, firstLastS, "left");

        // If the "syllable" is a digraph (rr,ll,ch), merge into the previous one
        if (this.isTwoLettersSounds(lastS)) {
            syllables[syllables.length - 2] = syllables[syllables.length - 2] + lastS;
            syllables.pop();
            return syllables;
        }

        // No syllable can be a single consonant.
        // If last letter of prev + first of current forms a diphthong, join them (fix over-split).
        if (lasSEst === "C" || (firstLetLastEst !== "C" && this.isValidVowelCluster(conjuntion)))
            this.moveAround(syllables, syllables.length - 1, lastS, "left");

        //If syllable is still unmutated and is invalid and it's made of 2 CC            
        if (syllables.join("") === ogSyllables && !this.isValidSyllable(syllables.at(-1)) && this.getEst(lastS) === "CC") {

            // we test removing last C, and adding a V at the begining if syllable doesn't end in s
            let test = this.vowelsWildcard + lastS.slice(0, 1);
            if (lastS.at(-1) !== "s" && this.isValidSyllable(test))
                syllables[syllables.length - 1] = test;
        }

        // If syllable is still unmutated  we look for an ending valid syllable from rigth to left
        // oposed to the normal flow => from left to rigth
        if (syllables.join("") === ogSyllables)
            syllables = this.cutUntilTrue(syllables);

        // Final cleanup
        return typeof syllables === "object" ? syllables.filter((s) => s !== "") : syllables;
    }

    //
    // Cut a string into [left, right] where `right` is the first correct syllable suffix if possible.
    // If input is already an array of syllables and length>1, return as-is.
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
    // Heuristic syllable splitter
    // Streaming approach:
    //   - Buffer consonants until a vowel arrives, then flush (buffer + vowel) as syllable.
    //   - After each push, apply local rules to fix boundary mistakes.
    //

    splitInSyllables(word, pipeLineEnd = false) {

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
        return !pipeLineEnd ? this.rulesApply(syllables) : this.addAccents(this.rulesApply(syllables));
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
    // Prepare dictionary:
    //   - Split CSV-like content
    //   - Strip quotes at boundaries
    //   - Build a 2-level index Map: first-letter -> first-two-letters -> Set(words)
    //   - Persist raw string for future sessions and drop large arrays from RAM
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

        localStorage.setItem("magikEspellCheckDict", this.dictData)
        this.ready = true;
        this.dictData = null;

        // To proper warm up JIT given word must be incorrect,
        // otherwise it wouldn't fully warm up
        // Also code is writen to work based on the second case
        this.warmStart ? this.correct("aslons", this._null) : null;

        console.log("Dictionary fully loaded");
    }

    //
    // Get Set of candidates sharing same first two chars, if legal.
    // Returns Set<string> or false if missing/illegal prefix.
    //
    getSet(word) {

        const f2c = word.slice(0, 2);
        const fc = f2c.slice(0, 1);
        const wl = word.length;

        if (!this.dictMapped.get(`${fc}`) || !this.dictMapped.get(`${fc}`).has(`${f2c}`))
            return false;

        return this.dictMapped.get(`${fc}`).get(`${f2c}`);

    }


    //
    // Check:
    //   - onlyCheckSyllables=true: validate syllable legality (array or string)
    //   - onlyCheckSyllables=false: validate full word exact presence in dictionary bucket
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
    // Advanced syllable repair rules.
    // Injects wildcard vowels or repositions characters to transform illegal CC/CCC patterns
    // into correct CVC/CVVC forms, and fixes illegal endings by appending a vowel wildcard.
    //
    advancedRulesAplly(_syllable) {

        let syllable = _syllable;
        let V2F = this.isF2Valid(syllable),
            F3C = syllable.slice(0, 3),
            prevInsert = V2F ? syllable[0] : syllable[1],
            makeTest = prev => this.replaceCharAt(syllable, 1, prev + this.vowelsWildcard);

        // If the first three characters are consonants and the test  syllable (CVC) is valid
        // Change syllable to test pattern
        if (this.getEst(F3C) === "CCC" && this.isValidSyllable(makeTest(prevInsert)))
            return makeTest(prevInsert);

        // If AROUND current pos a CCV pattern is form and CC comb it's not valid 
        // we sustitute current char for VOWEL PATTERN (CVVC)
        let test = syllable[0] + this.vowelsWildcard + syllable[1] + syllable[2];
        if (this.getEst(syllable) === "CCV" && !V2F && this.isValidSyllable(test) && syllable[1] !== this.vowelsWildcard)
            return test;


        // IF CC COMB IS INVALID and only 2 chars EXIST...
        if (this.getEst(syllable) == "CC" && !V2F)
            return syllable[0] + this.vowelsWildcard + syllable[1];

        // IF ENDING IS INVALID...
        if (!this.hasValidEnding(syllable) && this.getEst(syllable.slice(0, 2)))
            return syllable + this.vowelsWildcard


        // IF CC COMB IS INVALID AND 3 OR MORE CHAR EXIST
        if (!V2F)
            return this.insertChar(syllable, 0, this.vowelsWildcard)

        // IF CC COMB IS INVALID AND 3 OR MORE CHAR EXIST
        if (V2F)
            return this.insertChar(syllable, 1, this.vowelsWildcard)

        return syllable;
    }

    //
    // Top-level syllabifier for correction:
    //   1) Try a robust split (fallback to cutUntilTrue if needed)
    //   2) Iterate (epochs) applying repairs
    //   3) Resplit with baseline syllabifier to avoid drift
    //
    splitInSyllables(_syllables) {

        let syllables = super.splitInSyllables(_syllables);
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
    // Generate length-/pattern-constrained regexes to probe dictionary buckets.
    // Uses:
    //   - onset alternatives (swap letters, fill wildcard with concrete vowels/consonants)
    //   - middle-length ±1 tolerance
    //   - ending wildcard alignment
    //
    generateMutations(word) {


        let candidate = this.splitInSyllables(word);
        let F2C = candidate.join("").slice(0, 2);
        let finalCandidates = [];

        let start = [F2C], middle = candidate.join(""), end = candidate.at(-1).slice(-1);
        const vowels = this.vowels;
        let startLetter = start[0][0];
        const consonants = [
            'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
            'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'
        ]

        // STARTS IN C BUT IT WAS MEANT TO START IN V
        if (this.getEst(startLetter) === "C") {
            vowels.forEach((l) => { start.push(l + startLetter) });
            vowels.forEach((l) => { start.push(l + word.slice(1, 2)) });
        }

        // STARTS IN V BUT IT WAS MEANT TO START IN C
        if (this.getEst(startLetter) === "V" && this.isValidSyllable(this.consonantssWildcard + startLetter))
            consonants.forEach((l) => { start.push(l + startLetter) });


        // IT WAS MEANT TO START WITH THE FIRST 2 LETTERS  ORDER SWAPPED 
        if (this.isValidSyllable(F2C[1] + F2C[0]))
            start.push(F2C[1] + F2C[0]);

        // WORD'S START VRS IF ANY (expand wildcard to concrete vowels/consonants)
        if (/[§|~]/.test(F2C)) {

            F2C.indexOf(this.vowelsWildcard) >= 0 ? vowels.forEach((l) => { start.push(F2C.replace(this.vowelsWildcard, l)) })
                : consonants.forEach((l) => { start.push(F2C.replace(this.consonantssWildcard, l)) });
        }

        // PATTER MIDDLE: remove first two chars and terminal suffix to isolate the middle-run length
        middle = middle.slice(2, -(end.length))


        // GENERATING FINAL MUTATIONS TO TEST AGAINST CLUSTER
        start.forEach((st) => {

            let n = middle.length;
            for (let index = -2; index < 2; index++) {

                // NOTE: [a-z] here is ASCII-limited by design, because dictionary tokens are normalized ASCII.
                // If dictionary becomes fully Unicode-normalized, this can be widened accordingly.
                let expReg = `${st}[a-z]{${(n + index)}}${end}`;
                if (/[§|~]/.test(st))
                    continue;

                finalCandidates.push(expReg);
            }
        })
        return finalCandidates;
    }

    //
    // Given mutation regexes and the original word, scan matching bucket and score candidates.
    // Filters:
    //   - exact length for each regex (precomputed `ln`)
    //   - regex match
    //   - similarity >= stringDiff
    // Deduplicates with noiseCache, sorts by score desc, trims to maxNumSuggestions.
    //
    returnSuggestions(patterns, ogWord) {

        //console.log(patterns)
        let invf2l = ogWord[1] + ogWord[0];
        let noiseCache = this.noiseCache;

        let sugestions = [];
        patterns.forEach((pattern) => {

            let set = this.getSet(pattern.slice(0, 2));
            if (!set) return;
            let reg = new RegExp(pattern, "i")
            let pool = [...set];
            let ln = (pattern.split("[a-z]{").join("").length - 2) + parseInt(pattern.split("{")[1].split("}")[0]);

            pool.forEach((w) => {

                if (noiseCache.has(w) || w.length !== ln || !reg.test(w)) return;

                let score = this.diffScoreStrings(ogWord, w);

                // If the first two letters are swapped, reduce the difference level
                invf2l == w.slice(0, 2) ? score = score + this.diffTolerance : null;

                if (score < this.stringDiff) return;

                noiseCache.add(w);
                sugestions.push([w, score]);
            })
        })
        return sugestions.sort((a, b) => b[1] - a[1]).slice(0, this.maxNumSuggestions).map((s) => this.addAccents(s));
    }

    //
    // correct(word, callBack?)
    // Orchestrates the flow:
    //   1) Wait until dictionary is ready (warm cache on first call if warmStart)
    //   2) If the word is valid (exact match in its bucket), return true (synchronous)
    //   3) Compute scored suggestions
    //   4) If not warm-starting and callback exists, invoke callback(suggestions)
    // Note:warmStart
    //   - Uses a setInterval-based "waitTillReady" to keep a callback-style API (no Promises).
    //
    correct(word, callBack = false) {

        // Early error  return depending on wether the dict is ready or not, and callback is false
        if (!callBack && !this.ready)
            throw new Error("For using correct() without any callback, dictionary must be loaded first!");


        // comment this if you dont want to mesure exec time
        const start = performance.now();
        let rInt; // use to clear callback int
        //
        // This helper sustitutes a promise paradigm for a callback return type paradigm, wich I preffer.
        // You call correct method with the callback to exec return as 2nd argument
        //  If  you don't like it you can swith to a promise paradigm type
        //
        const waitTillReady = () => {
            rInt = setInterval(() => { this.ready ? clearInterval(rInt) & run() : null }, 500)
        }

        const run = () => {

            this.noiseCache = new Set([]);

            if (this.check(word)) {

                if (!!callBack) return callBack(true);
                return true;
            }

            let mutations = this.generateMutations(word)

            let sugestions = this.returnSuggestions([...mutations], word);
            this.isValid(start) && !this.warmStart ? this.printTime(start, " EXEC TIME", 10) : null;

            this.warmStart ? this.warmStart = false : null;

            if (!!callBack)
                return callBack(sugestions);

            return sugestions;
        }

        (!this.ready) ? waitTillReady() : null;

        if (this.ready)
            return run();
    }

}

const spell = new magikEspellCheck();
