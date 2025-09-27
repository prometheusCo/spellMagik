// Core utility methods
class coreFunctions {

    // Vowels used to better clasification
    vowelsOpened = ['a', 'e', 'o'];
    vowelsClosed = ['i', 'u'];
    vowels = [...this.vowelsOpened, ...this.vowelsClosed];

    // Consonants types  used for ruling out of syllables
    plosives = ["p", "t", "k", "b", "d", "g"];
    fricatives = ["f", "s", "j", "z"];
    affricates = ["ch"];
    nasals = ["m", "n", "ñ"];
    laterals = ["l", "ll"];
    approximants = ["b", "x"];
    vibrants = ["r", "rr"];

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
        "PCVC", // pr, br, tr, dr, cr, gr
        "FCLC", // fl
        "FCVC", // fr
    ];

    // Used to rule out syllables with invalind endings 
    forbiddenEnds = ["c", "k"];

    //Exceptions to rules above
    forbiddenEndsExc = [
        "pec", "truc", "trac", "vic", "dic", "fec", "fac", "ac",
        "obs", "dac", "cons", "duc", "jec"
    ];

    //
    // Simple one-liner helpers
    clean = s => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    pos = n => n < 0 ? n * (-1) : n;
    //
    // Given a word, return its V/C structure (e.g., VOWEL + CONSONANT + VOWEL…)
    getEst(word, returnType = "string") {

        word = this.clean(word)
        let r = word.split("").map((a) => this.vowels.includes(a) ? "V" : "C");
        if (returnType === "string")
            return r.join("");

        return r;
    }
    //
    // Check for any kind of invalid input
    isValid(val) {
        if (val === undefined || val === null || val.indexOf("undefined") >= 0 || val.indexOf("null") >= 0)
            return false;
        return true;
    }
    //
    // Reverse search in an array; optionally allow loose (near-length) matches
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

            if (this.plosives.includes(wordAsArray[index])) return "PC";
            if (this.fricatives.includes(wordAsArray[index])) return "FC";
            if (this.affricates.includes(wordAsArray[index])) return "CA";
            if (this.nasals.includes(wordAsArray[index])) return "NC";
            if (this.laterals.includes(wordAsArray[index])) return "LC";
            if (this.approximants.includes(wordAsArray[index])) return "AC";
            if (this.vibrants.includes(wordAsArray[index])) return "VC";

            return "C";
        });
        if (returnType !== "array") return r.join("");
        return r;
    }
    //
    // Validate first two letters (onset) against allowed clusters and exceptions
    isF2Valid(word) {

        let f2 = word.slice(0, 2); let f3 = word.slice(0, 3); let est = this.getEstExt(f2, "str");

        if (f2 === "cc" || word === "ch" || word === "rr" || word === "ll")
            return false;
        if (f2 === "rr" || f2 === "ll" || est === "CV" || f2 == "ch" || f2 === "ps" || f3 === "ciu" || f3 === "cie")
            return true;

        return this.valid2CSounds.includes(est);
    }
}

//
//
// Main class
//
class Syllabifyer extends coreFunctionsExt {

    constructor() {
        super();
        // Avoid user's cold start; priming cache with an example word is optional
        this.splitInSyllables("produccionando")
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
        if (lasSEst.slice(0, 2) === "CC" && !this.isF2Valid(lastS)) {

            if (lastS == "ch" || lastS == "ll") {
                syllables[syllables.length - 2] = syllables[syllables.length - 2] + lastS;
                syllables.pop();
                return syllables;
            }
            this.moveAround(syllables, syllables.length - 1, firstLastS, "left");
        }

        // Fix invalid syllable endings
        if (this.forbiddenEnds.includes(lastLetterLastlastS) && !this.forbiddenEndsExc.includes(this.clean(lastLastS)))
            this.moveAround(syllables, syllables.length - 2, lastLetterLastlastS, "right");

        // No syllable can be a single consonant.
        // If last letter of previous + first of current form a diphthong, join them.
        if (lasSEst === "C" || (firstLetLastEst !== "C" && !!this.reverseSearch(conjuntion, this.diphthongsAndtriphthongs, true)))
            this.moveAround(syllables, syllables.length - 1, lastS, "left");

        // Final cleanup
        return syllables.filter((s) => s !== "");
    }

    //  
    // Heuristic syllable splitter
    //
    splitInSyllables(word) {

        //console.time("miScript");
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
        //console.timeEnd("miScript");
        return this.rulesApply(syllables);
    }

}

const spell = new Syllabifyer();
