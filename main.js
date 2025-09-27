// Core utility methods
class coreFunctions {

    //
    epochs = 10;

    // Vowels used to better clasification
    vowels = ['a', 'e', 'o', 'u', 'i'];

    // Consonants types  used for ruling out of syllables
    plosives = ["PC", "p", "t", "k", "b", "d", "g"];
    fricatives = ["FC", "f", "s", "j", "z"];
    affricates = ["AFC", "ch"];
    nasals = ["NC", "m", "n", "ñ"];
    laterals = ["LC", "l", "ll"];
    approximants = ["AC", "b", "x"];
    vibrants = ["BC", "r", "rr"];

    consonantsTypes = ["PC", "FC", "AFC", "NC", "LC", "AC", "BC"]


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
    valid2CSounds = [
        "PCLC", // pl, bl, cl, gl
        "PCBC", // pr, br, tr, dr, cr, gr
        "FCBC", // fr
    ];


    // Used to determine if a syllable is misspelled by looking at it's ending letters
    invalidSyllablesEndings = ["k", "g", "c", "x"];

    invalidSyllablesEndingsExceptions = ["ac", "oc", "ec", "ic"]
    //
    // Simple one-liner helpers
    clean = s => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    pos = n => n < 0 ? n * (-1) : n;
    isValid = val => val !== undefined && val !== "" && val !== null && val !== "undefined";
    replaceCharAt = (str, pos, char) => str.slice(0, pos) + char + str.slice(pos + 1);
    splitArrayAt = (arr, pos) => [arr.slice(0, pos), arr.slice(pos)];
    //
    // Given a word, return its V/C structure (e.g., VOWEL + CONSONANT + VOWEL…)
    getEst(word, returnType = "string") {

        if (!this.isValid(word)) return "";
        word = this.clean(word)
        let r = word.split("").map((a) => this.vowels.includes(a) ? "V" : "C");
        if (returnType === "string")
            return r.join("");

        return r;
    }
    //
    // Try to find a match for a `word` inside an `array`. If `loose` is false → only exact matches are found
    // if `loose` is true → near matches are allow . Returns the first matching element, or `false`.
    // 
    reverseSearch(word, array, loose = false) {

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
    // Validate first two letters (onset) against allowed clusters and exceptions
    isF2Valid(word) {

        const isEst = (word[0] !== word[0].toLowerCase()) ? true : false;

        let f2 = !isEst ? word.slice(0, 2) : "";
        let f3 = !isEst ? word.slice(0, 3) : "";
        let est = !isEst ? this.getEstExt(f2, "str") : word.slice(0, 4);
        let estS = !isEst ? this.getEst(word, "string").slice(0, 2) : word;

        console.log(est + " " + estS);
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
        return this.valid2CSounds.includes(est);
    }
}

//
//
// Syllabifier class
//
class Syllabifier extends coreFunctionsExt {

    constructor() {
        super();
        // Avoid user's cold start; priming cache with an example word is optional
        this.splitInSyllables("produccionando")
    }

    SyllableHasValidEnding(lastLetterLastlastS, lastLastS) {
        if (this.forbiddenEnds.includes(lastLetterLastlastS) && !this.forbiddenEndsExc.includes(this.clean(lastLetterLastlastS)))
            return false;
        return true;
    }

    //
    // Heuristic rules to help the main loop split into syllables more accurately
    //
    rulesApply = (syllables) => {

        console.log("=>" + syllables);
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
        if (lasSEst.slice(0, 2) === "CC" && !this.isF2Valid(lastS)) {

            if (lastS == "ch" || lastS == "ll") {
                syllables[syllables.length - 2] = syllables[syllables.length - 2] + lastS;
                syllables.pop();
                return syllables;
            }
            this.moveAround(syllables, syllables.length - 1, firstLastS, "left");
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

        console.time("miScript");
        word = word.toLowerCase();

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
        console.timeEnd("miScript");
        return this.rulesApply(syllables);
    }

}

//
// Class extension to the main Syllabifyer class, focused on syllabifying misspelled words
//
class magikEspellCheck extends Syllabifier {

    constructor() {
        super();
    }

    //
    // Detects whether a syllable is misspelled or not based on first 2 consonants,
    // structure, last char type or general structure of the syllable
    isValidSyllable(syllable) {

        let isEst;
        try { isEst = (syllable[0] !== syllable[0].toLowerCase()) ? true : false; } catch (error) { return false; }

        const syllableEst = !isEst ? this.getEst(syllable) : syllable.join("").replaceAll(/[A-B|D-U| W-Z]/g, "");
        const syllableEnding = !isEst ? syllable.slice(syllable.length - 1) : "";
        const f2l = !isEst ? syllable.slice(0, 2) : "";

        if (syllableEst === "C")
            return false;

        if (syllableEst === "V")
            return true;

        if ((syllableEst === "CV" || syllableEst === "VC" || syllableEst === "VCV" || syllableEst === "CVCV" || syllableEst === "CVC")
            && (!this.invalidSyllablesEndings.includes(syllableEnding) || this.invalidSyllablesEndingsExceptions.includes(syllable)))
            return true;

        if (syllableEst === "CCC")
            return false;

        if (isEst) syllable = syllable.join("");
        return this.isF2Valid(syllable)
    }

    //
    //
    generateVariations(entry, pool = [...this.consonantsTypes, ...["V"]], includeSame = true) {

        const indices = [...entry.keys()];
        const combos = (xs) =>
            xs.reduce(
                (acc, x) => acc.concat(acc.map(s => s.concat(x))),
                [[]]
            ).slice(1); // sin conjunto vacío

        const optionsAt = i => (includeSame ? pool : pool.filter(t => t !== entry[i]));
        const replaceAt = (arr, i, val) => arr.map((x, k) => (k === i ? val : x));
        const cartesian = (arrays) =>
            arrays.reduce((a, b) => a.flatMap(x => b.map(y => x.concat([y]))), [[]]);

        let r = combos(indices).flatMap(idxs =>
            cartesian(idxs.map(i => optionsAt(i))).map(tokens =>
                idxs.reduce((acc, i, p) => replaceAt(acc, i, tokens[p]), entry)
            )
        );

        return r.filter((v) => this.isValidSyllable(v));
    }

    //
    // Given a word, takes it's misspelled syllables and returns plausible variations for them
    mutate(word) {

        const syllables = super.splitInSyllables(word); // original syllables array
        let syllablesMS = [...syllables]; // Misspelled syllables
        let mutations = new Map(); // Map with all mutations (is like using php asociatives arrays)

        // classifying misspelled syllables
        for (let index = 0; index < syllables.length; index++) {

            const currentPos = syllables[index];
            if (this.isValidSyllable(currentPos))
                syllablesMS[index] = "";
        }

        // Sanitation check
        syllablesMS = syllablesMS.length === 1 ?
            this.splitArrayAt(syllablesMS[0], syllablesMS[0].length / 2) : syllablesMS;

        // Generating mutations for each misspelled syllable
        syllablesMS.forEach((sylms, index) => {

            if (!this.isValid(sylms))
                return;

            !mutations.has(`${sylms}`) ? mutations.set(`${sylms}`, []) : null;

            let _mutations = this.generateVariations(this.getEstExt(sylms));
            mutations.get(`${sylms}`).push(_mutations);

        })

        console.log(mutations);
    }

}

const spell = new Syllabifier();
