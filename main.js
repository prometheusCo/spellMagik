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

    dictData;
    accentedWords = new Map()
    accentedWordsSet = new Set([]);
    dictMapped = new Map();

    //
    //  CONF ZONE
    //

    //  Remote dictionary (comma-separated tokens; optionally gzip-compressed)
    dictionaryUrl = "https://raw.githubusercontent.com/prometheusCo/spellMagik/refs/heads/main/Dicts/Es/dictionaryC.txt";

    //  Max refinement passes when spliting in syllables
    epochs = 3;

    //  Minimum similarity to accept suggestion (0–1). Higher => stricter
    stringDiff = 70;


    //  Cap on suggestions returned
    maxNumSuggestions = 10;

    //  Warm-up run to avoid first-call latency
    warmStart = false;


    //  Wildcard tokens used INSIDE candidate patterns:
    //  vowelsWildcard => matches any vowel; consonantssWildcard => any consonant
    vowelsWildcard = "§";
    consonantssWildcard = "~";

    //
    //  CONF ZONE END
    //
    //

    consonants = [
        'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
        'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z', 'ñ'
    ]

    // Vowels used for syllabification and others checks 
    weakVowels = ['i', 'u'];
    strongVowels = ['a', 'e', 'o']

    // Set used by classification helpers
    vowels = new Set([...this.weakVowels, ...this.strongVowels, ...[this.vowelsWildcard]]);

    // Consonant classes (sound types) used to validate onsets/clusters
    plosives = ["PC", "p", "t", "k", "b", "d", "g", this.consonantssWildcard];
    fricatives = ["FC", "f", "s", "j", "z", this.consonantssWildcard];
    affricates = ["AFC", "ch", this.consonantssWildcard];
    nasals = ["NC", "m", "n", "ñ", this.consonantssWildcard];
    laterals = ["LC", "l", "ll", this.consonantssWildcard];
    approximants = ["AC", "b", "x", this.consonantssWildcard];
    vibrants = ["BC", "r", "rr", this.consonantssWildcard];


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
    invalidSyllablesEndings = new Set(["k", "g", "c", "x", "f", "d", "v", "gn", "w", "h"]);

    // Secondary endings blacklist (more specific)
    invalidSyllables2Endings = new Set(["vl", "fn"]);

    // Exceptions that keep some endings correct despite blacklist above
    invalidSyllablesEndingsExceptions = new Set(["ac", "oc", "ec", "ic", "ag", "ex", "ed"]);

    // Illegal word starts that instantly mark a syllable split as invalid
    invalidStarts = new Set(["ki", "qi", "vr", "ko", "st", "rv"]);

    // Suspicious starts: not an outright error, but trigger extra mutation attempts
    suspiciousStarts = new Set(["w", "k"]);

    // Cache to avoid duplicate candidates during suggestion expansion
    foundCache;

    // Invalid syllabes false positives
    invalidSyllablesFalseP = new Set(["au"])

    // Flag set true when dictionary is ready
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
    //
    normalize = s => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, (m, i, a) => (m === '\u0303' && /[nN]/.test(a[i - 1])) ? m : '').normalize('NFC').toLowerCase() : s;
    // Silent exec
    _null = a => a;
    // helper
    diffChars = (a, b) => [...new Set(a + b)].filter(c => a.includes(c) !== b.includes(c));


    //
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
    // Load dictionary into memory, supporting plain text or gzip (browser-native DecompressionStream)
    // Persists raw string in localStorage to avoid refetching across sessions.
    dictionaryLoad = (url) => {

        const KEY = "magikEspellCheckDict";
        const ok = r => r.ok ? r : Promise.reject(new Error(`Failed: ${r.status} ${r.statusText}`));
        const set = t => (this.dictData = t, t && this.prepareDict());

        // Heuristic base64 detector
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

        const toBytes = s => isB64(s) ? fromB64(s) : fromBin(s);
        const isGzip = bytes => bytes && bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
        const gunzip = bytes => {
            const ds = new DecompressionStream("gzip");
            const stream = new Response(bytes).body.pipeThrough(ds);
            return new Response(stream).text();
        };

        const decodeMaybeCompressed = s => {
            const bytes = toBytes(s);
            return isGzip(bytes) ? gunzip(bytes) : Promise.resolve(s);
        };

        // 1) Try compressed localStorage cache 
        const cached = localStorage.getItem(KEY);
        if (this.isValid(cached)) return decodeMaybeCompressed(cached).then(set);

        // 2) Fallback to fetch; store RAW payload, decode for runtime, then prepare
        return fetch(url)
            .then(ok)
            .then(r => r.text())
            .then(raw => decodeMaybeCompressed(raw).then(txt => (localStorage.setItem(KEY, raw), txt)))
            .then(set);
    };


    //
    // Validates vowels clusters
    isValidVowelCluster(str) {

        if (/[gqc]üi|[gqc]uí|üí/giu.test(str))
            return true;

        const regex = /§?(?:[iuü][aeoáéó]|[aeoáéó][iuü]|[iuü]{2}|[iuü][aeoáéó][iuü]|[aeoáéó]y\b|[iuü]y\b|[iuü][aeoáéó]y\b)§?/iu;
        return regex.test(str);

    }

    //
    // Litle  helper to measure code exec time
    // Used around hot paths to observe exec time in seconds
    // declare start = performance.now() at the begining and this.printTime() at end
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

    // Adhoc method — same logic, faster: precompute sets and freqs, no regex, no joins
    diffScoreStrings(str1, str2) {

        let a = [...str1], b = [...str2], tl = a.length + b.length, diff = 0
        let loop = [a, b], done = new Set(), sets = [new Set(a), new Set(b)]
        let freq = [Object.create(null), Object.create(null)]
        for (let ch of a) freq[0][ch] = (freq[0][ch] || 0) + 1
        for (let ch of b) freq[1][ch] = (freq[1][ch] || 0) + 1
        loop.forEach((self, i) => self.forEach((ch) => {
            let j = i ^ 1
            if (done.has(ch)) return
            if (!sets[j].has(ch)) { diff += 1; return }
            let d = Math.abs((freq[i][ch] || 0) - (freq[j][ch] || 0))
            if (!d) return
            diff += d
            done.add(ch)
        }))
        return ((tl - diff) / tl) * 100
    }


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

        if (!this.accentedWordsSet.has(word))
            return word;

        return this.accentedWords.get(`${word}`)
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

            if (this.plosives.includes(wordAsArray[index])) return this.plosives[0];
            if (this.fricatives.includes(wordAsArray[index])) return this.fricatives[0];
            if (this.affricates.includes(wordAsArray[index])) return this.affricates[0];
            if (this.nasals.includes(wordAsArray[index])) return this.nasals[0];
            if (this.laterals.includes(wordAsArray[index])) return this.laterals[0];
            if (this.approximants.includes(wordAsArray[index])) return this.approximants[0];
            if (this.vibrants.includes(wordAsArray[index])) return this.vibrants[0];

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

        // Early return for easy cases: CV or VC is always ok for the first two slots
        if (estS === "CV" || estS == "VC")
            return true;

        // If first 2 letters starts in forbiden chars or full word is a 2 chars forbiden type, then we return false
        if (inValidStart || this.isTwoLettersSounds(word))
            return false;

        // If first 2 chars are common spanish 2 letters formed sounds or know 3 chars exceptions, then we return true
        if ((this.isTwoLettersSounds(f2) && word.length > 2) || f3 === "ciu" || f3 === "cie")
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

        const ogSyllables = [...syllables].join("").replaceAll(",", "");
        const lastS = syllables[syllables.length - 1];
        const lastLastS = syllables[syllables.length - 2] ?? false;
        const hasMutated = () => { return ogSyllables === syllables.join("").replaceAll(",", "") };

        if (!lastLastS) return this.cutUntilTrue(syllables);

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
        if (!hasMutated() && !this.isValidSyllable(syllables.at(-1)) && this.getEst(lastS) === "CC") {

            // we test removing last C, and adding a V at the begining if syllable doesn't end in s
            let test = this.vowelsWildcard + lastS.slice(0, 1);
            if (lastS.at(-1) !== "s" && this.isValidSyllable(test))
                syllables[syllables.length - 1] = test;
        }

        // If syllable is still unmutated  we look for an ending valid syllable from rigth to left
        // oposed to the normal flow => from left to rigth
        if (!hasMutated())
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

        if (pipeLineEnd)
            word = this.normalize(word);

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

    noiseCache = new Set();

    constructor() {

        super();
        this.dictionaryLoad(this.dictionaryUrl);
    }

    // Returns true if a char is adyacent to another in a qwerty keyboard
    adjacentQwerty = (a, b) => {

        a = (a || '').toLowerCase(); b = (b || '').toLowerCase();
        let rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"], ra = -1, rb = -1, ca = 0, cb = 0, i = 0, ia = 0, ib = 0;
        for (; i < 3; i++) ia = rows[i].indexOf(a), ib = rows[i].indexOf(b), ra = ra < 0 && ia > -1 ? i : ra, ca = ia > -1 ? ia : ca, rb = rb < 0 && ib > -1 ? i : rb, cb = ib > -1 ? ib : cb;
        return a && b && a !== b && ra > -1 && rb > -1 ? Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1 : false;
    }


    // To proper warm up JIT given words must be incorrect,
    // otherwise it wouldn't fully warm up
    // Also code is writen to work based on that basis
    handleWarmStartAll = async () => {

        if (!this.warmStart) return null;

        const results = await Promise.all([

            this.correct("pkdms", false, true),
            this.correct("rvluchn", false, true),
            this.correct("aslonjs", false, true),

        ]);

        return results;
    };


    //
    // Prepare dictionary:
    //   - Split CSV-like content
    //   - Strip quotes at boundaries
    //   - Build a 2-level index Map: first-letter -> first-two-letters -> Set(words)
    //   - Persist raw string for future sessions and drop large arrays from RAM
    //

    prepareDict() {

        // Ensure sources are initialized
        if (typeof this.dictData === "string") this.dictData = this.dictData.split(",");
        if (!this.dictMapped) this.dictMapped = new Map();
        if (!this.accentedWords) this.accentedWords = new Map();

        this.dictData.forEach((raw) => {

            if (!this.isValid(raw)) return;

            const original = String(raw);
            const normalized = this.normalize(original).toLowerCase();

            // Accent bookkeeping (optional overwrite behavior kept as-is)
            if (/[à-ÿ]/i.test(original)) this.accentedWords.set(normalized, original);

            // Skip very short tokens; avoid creating half-built buckets
            if (normalized.length < 3) return;

            const f3c = normalized.slice(0, 3);
            const wEnd = normalized.slice(-1);

            // Get or create first level
            let firstLevel = this.dictMapped.get(f3c);
            if (!firstLevel) {
                firstLevel = new Map();
                this.dictMapped.set(f3c, firstLevel);
            }

            // Get or create second level bucket
            let bucket = firstLevel.get(wEnd);
            if (!bucket) {

                bucket = new Map();
                bucket.set("pool", []);          // Pattern-like searches
                bucket.set("poolS", new Set());  // Fast presence checks
                bucket.set("index", new Map());  // Length pointers for pool
                firstLevel.set(wEnd, bucket);
            }

            // Insert word
            bucket.get("pool").push(normalized);
            bucket.get("poolS").add(normalized);
        });


        // Used for detect acccented words and correct them
        this.accentedWordsSet = new Set([... this.dictData.filter((w) => /[à-ÿ]/i.test(w))].map((w) => this.normalize(w)));

        this.dictData = [];
        (!this.warmStart) ? this.ready = true :
            this.handleWarmStartAll().then(results => { console.log("warm up ready"); this.ready = true; });

        console.log("Dictionary fully loaded");
        this.sortPools();
        this.indexLengthJumps();

    }


    sortPools() {

        this.dictMapped.forEach(firstLevel => {

            firstLevel.forEach(bucket => {
                const pool = bucket.get("pool");
                if (!Array.isArray(pool) || pool.length === 0) return;

                // Remove duplicates and sort by length (desc)
                const cleaned = [...new Set(pool)].sort((a, b) => b.length - a.length);
                bucket.set("pool", cleaned);
            });
        });
    }

    indexLengthJumps() {

        this.dictMapped.forEach(firstLevel => {
            firstLevel.forEach(bucket => {
                const pool = bucket.get("pool");
                const idx = bucket.get("index");

                if (!idx || typeof idx.clear === "function") idx?.clear?.();

                if (!Array.isArray(pool) || pool.length === 0) return;

                let lastLen = -1;
                for (let i = 0; i < pool.length; i++) {
                    const len = pool[i].length;
                    if (len !== lastLen) {
                        idx.set(len, i);   // pointer to first item with this length
                        lastLen = len;
                    }
                }
            });
        });
    }



    //
    // Get Set of candidates sharing same first two chars, if legal.
    // Returns Set<string> or false if missing/illegal prefix.
    //

    getSet(word, wEnd = false) {

        const f3c = word.slice(0, 3);
        wEnd = !wEnd ? word.slice(-1) : wEnd;

        let firstLevel = this.dictMapped.get(`${f3c}`);
        if (!firstLevel) return false;

        let secondLevel = firstLevel.get(`${wEnd}`);
        if (!secondLevel) return false;

        return secondLevel;
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
        if (!set || !set.get(`poolS`).has(word))
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
        if (!this.hasValidEnding(syllable))
            return syllable + this.vowelsWildcard


        // IF CC COMB IS INVALID AND 3 OR MORE CHAR EXIST
        if (!V2F)
            return this.insertChar(syllable, 0, this.vowelsWildcard);

        // IF CC COMB IS INVALID AND 3 OR MORE CHAR EXIST
        if (V2F)
            return this.insertChar(syllable, 1, this.vowelsWildcard)

        return syllable;
    }


    // DIFF SCORE EXPANSION
    diffScoreStrings(original, sustitute) {

        let prev = super.diffScoreStrings(original, sustitute);
        let minus = this.pos(original.length - sustitute.length);

        if (minus <= 3) return prev;

        // PENALIZING BIGGER LENGTHS DIFF OVER SIMILAR ONES
        return prev - (minus * (0.09));
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

        // Handling worst case scenarios in wich no valid syllabell can be found
        /*if (syllables.length === 1)
            syllables = this.cut*/

        while (epochs < this.epochs && !hasValidSyllables) {

            [...syllables].some((s, index) => {

                if (this.isValidSyllable(s))
                    return;

                s = this.advancedRulesAplly(s);
                if (this.isValidSyllable(s)) {
                    syllables[index] = s; return;
                }
                let cutTest = this.cutUntilTrue(s);

                if (this.isValidSyllable(cutTest[1]))
                    syllables.splice(index + 1, 0, cutTest[1]);

                syllables[index] = cutTest[0];
                return true;
            })

            if (this.check(syllables.join(""), true))
                hasValidSyllables = true;

            syllables = ogSyllabifier.splitInSyllables(syllables.join(""))
            epochs++;

        }
        return syllables;
    }




    //
    // SEARCH ADY CHARS IN QWERTY KEYBOARD
    adjacentQwertyFind(key) {
        return [...this.vowels.filter((v) => v !== this.vowelsWildcard), ...this.consonants].filter((l) => this.adjacentQwerty(key, l));
    }

    findAltEnd(w) {

        let a = w.slice(-2, 1);
        let b = w.slice(-1);
        return this.adjacentQwertyFind(b).filter((s) => this.isValidSyllable(a + s));
    }


    // Generates posible patterns using posible starts vrs 
    // & reg expressions
    generateMutations(word) {


        let candidate = this.splitInSyllables(word).join("").replaceAll(",", "");
        let posiblePatterns = [candidate];
        const vowels = [...this.vowels];
        const consonants = this.consonants;
        let patternsDone = new Set();

        const wildcardsExpand = (candidate, toExpand, wildcard, toPush) => toPush.push(toExpand.map(v => candidate.replaceAll(wildcard, v)));
        const getVariants = s => [...new Set(s.split('').flatMap(a => s.split('').flatMap(b => s.split('').map(c => a + b + c))))];

        const patternHelper = (st, rest, end) => {

            if (patternsDone.has(st)) return false;

            let altEnd = x => !this.vowels.has(x) ? `(${x}([aeiou])?)$` : `(${x}([^aeiou])?)$`;
            let minLn = rest.length - 2 < 0 ? 0 : rest.length - 2;
            let maxLen = rest.length + 2;

            patternsDone.add(st);
            return [st + "[a-zñ]" + `{${minLn},${maxLen}}${altEnd(end)}`, [minLn, maxLen], end];
        }

        let start = candidate.slice(0, 2);
        let end = candidate.slice(-1);

        let candidateVrsV = [], candidateVrsC = [];
        let starVrs = [];


        // EXPANDING WILCARDS TO ACCTUAL POS WORDS IF ANY
        /§/.test(candidate) ?
            wildcardsExpand(candidate, vowels, this.vowelsWildcard, candidateVrsV)
            : null;

        /~/.test(candidate) ?
            wildcardsExpand(candidate, consonants, this.consonantssWildcard, candidateVrsC)
            : null;

        posiblePatterns = [...posiblePatterns, ...candidateVrsV[0] ?? [], ...candidateVrsC[0] ?? []];
        // CLEANING
        posiblePatterns = posiblePatterns.filter((p) => !/[§|~]/.test(p));

        let validC = new Set();
        // FOR EACH POS CANDIDATE TESTING AND  REPAIRING WRONG STARs OR ENDs
        [...posiblePatterns].forEach((cand, index) => {

            if (!!this.getSet(cand))
                return true;

            starVrs = getVariants(cand.slice(0, 3)).filter((st) => !!this.dictMapped.get(`${st}`));
            {
                posiblePatterns.splice(index, 1);
                starVrs = starVrs.map((st) => st + cand.slice(3));
                starVrs.unshift(cand.slice(0, 3) + cand.slice(3));
            }

            // is ending valid???
            let isValindEnding = starVrs.filter((sv) => !!this.getSet(sv)).length > 0;

            // Filtering low quality star vrs
            starVrs = starVrs.filter(vr => this.diffScoreStrings(start, vr.slice(0, 2)) >= this.stringDiff);

            // we got also a wrong ending
            starVrs.forEach((vr) => {

                let pValidC = (vr.slice(0, 3) + "::" + vr.slice(-1));

                if (validC.has(pValidC)) return;
                [...consonants, ...vowels].forEach((l) => {

                    let test = vr.slice(0, -1) + l;
                    let isValidSet = !!this.getSet(test);
                    pValidC = isValidSet ? (vr.slice(0, 3) + "::" + l) : pValidC;

                    if (validC.has(pValidC) || !this.adjacentQwerty(l, vr.slice(-1)))
                        return;

                    !isValindEnding ?
                        (isValidSet ? posiblePatterns.push(test) : null) : (posiblePatterns.push(vr));

                    validC.add(pValidC);
                })
            });

        });

        // ACCTUALLY CREATING MUTATIONS (  PATTERNS FOR POSIBLE WORDS )
        posiblePatterns = posiblePatterns.map((p) => patternHelper(p.slice(0, 3), p.slice(3, -1), p.slice(-1)));
        return posiblePatterns.filter((p) => !!p);

    }


    //
    // Given mutation regexes and the original word, scan matching bucket and score candidates.
    // Filters:
    //   - exact length for each regex (precomputed `ln`)
    //   - regex match
    //   - similarity >= stringDiff
    // Deduplicates with foundCache, sorts by score desc, trims to maxNumSuggestions.
    //

    returnSuggestions(patterns, ogWord) {

        console.log(patterns);

        let sugestions = [];
        const sortAndCut = () => {
            return sugestions.sort((a, b) => b[1] - a[1]).slice(0, this.maxNumSuggestions);
        }

        const makeBonusesSuggestions = () => {

            // CHEAP SUGGESTIONS ARE MADE OVER TOP OG SUGESTIONS
            // (CHEAPER THAT DOING OVER ALL RETURNED CANDIDATES)
            sortAndCut();

            // Common helper to try a variant and add it if valid
            const addVariant = (base, make) => {

                const test = make(base);
                return (!this.foundCache.has(test) && this.check(test))
                    ? (sugestions.push([test, this.diffScoreStrings(ogWord, test)]), this.foundCache.add(test), true)
                    : false; // early return, no side effects if invalid
            };

            sugestions.forEach(s => {
                const base = s[0];

                addVariant(base, w => w.slice(1));     // delete first char
                addVariant(base, w => w.slice(0, -1)); // delete last char
                //Ading letters at word's end
                [...this.vowels, ...this.consonants].forEach((l) => { addVariant(base, w => w + l); })
            });

        }


        //
        // MAIN  SEARCH LOOP
        //
        patterns.some((_pattern) => {

            const [pattern, range, ending] = _pattern;
            let set = this.getSet(pattern.slice(0, 3), ending);
            if (!set) return;

            let reg = new RegExp(pattern, "i");

            //Normal pool + words ending in vowel or consonants that have the pattern `ending` at.(-2)
            // (this amplifies the search range a lot without costing much effort)
            let pool = set.get(`pool`)

            console.log(pool)
            pool.forEach((w) => {

                if (this.foundCache.has(w) || !reg.test(w))
                    return;

                let score = this.diffScoreStrings(ogWord, w);

                if (score < this.stringDiff) return;

                this.foundCache.add(w);
                sugestions.push([w, score]);

            })

        })

        makeBonusesSuggestions();
        return sortAndCut(sugestions);
    }


    //
    // Handles both synchronous and asynchronous (Promise-based)
    // execution depending on dictionary readiness.
    //

    correct(word, callBack = false, silentExec = false) {

        const exec = () => {

            this.foundCache = new Set();
            let start = this.ready ? performance.now() : null;
            const og = String(word).toLowerCase();
            word = this.normalize(word).toLowerCase();

            if (this.check(word)) {

                const accented = this.addAccents(word);

                // true if perfectly correct; otherwise single accented suggestion
                const out = accented !== og ? [accented, 0.99] : true;
                return callBack ? callBack(out) : out;
            }

            const suggestions = this.returnSuggestions([...this.generateMutations(word)], word);

            this.ready && this.isValid(start) && !silentExec ?
                this.printTime(start, " EXEC TIME", 10) : null;

            this.ready && this.warmStart ? (this.warmStart = false) : null;
            return callBack ? callBack(suggestions) : suggestions;
        };

        const isReady = () => { this.ready ? (clearInterval(id), resolve(exec())) : null };

        return (silentExec || this.ready)

            ? exec() : new Promise(resolve => {
                const id = setInterval(() => (isReady(id)), 200);
            });

    };

}
const spell = new magikEspellCheck();
