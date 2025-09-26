//
// Core methods class
class coreFunctions {

    vowelsOpened = ['a', 'e', 'o'];
    vowelsClosed = ['i', 'u'];
    vowels = [...this.vowelsOpened, ...this.vowelsClosed];

    plosives = ["p", "t", "k", "b", "d", "g"];
    fricatives = ["f", "s", "j", "z"];
    affricates = ["ch"];
    nasals = ["m", "n", "ñ"];
    laterals = ["l", "ll"];
    approximants = ["b", "x"];
    vibrants = ["r", "rr"];

    diphthongs = [
        "ia", "ie", "io", 'uei',
        "ua", "ue", "uo", "ió",
        "ai", "ei", "oi",
        "au", "eu", "ou",
        "iu", "ui", "ai",
        "üi", "üe", "üa",
        "üé", "uí", "üí"
    ];

    // Valid two-consonant ONSET clusters by SOUND TYPE 
    validOnset2ByType = [
        "PCLC", // pl, bl, cl, gl
        "PCVC", // pr, br, tr, dr, cr, gr
        "FCLC", // fl
        "FCVC", // fr
    ];

    // Valid two-consonant CODA clusters by TYPE 
    validCoda2ByType = [];

    valid2CSounds = [...this.validOnset2ByType, ...this.validCoda2ByType];
    diphthongsExceptions = ["uí", "üí"]

    forbiddenEnds = ["c", "k"];

    forbiddenEndsExc = [
        "pec", "truc", "trac", "vic", "dic", "fec", "fac", "ac",
        "obs", "dac", "cons", "duc", "jec"
    ];

    //
    //Simple one liners helpers
    clean = s => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    isCapitalized = word => /^[A-ZÁÉÍÓÚÑÜ]/.test(word);
    capitalize = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    hasAccent(vowel) { return this.accents.includes(vowel); }
    pos = n => n < 0 ? n * (-1) : n;
    //
    // Given a word, returns it's structure (VOWEL + CONSONANT + VOWEL...)
    getEst(word, returnType = "string") {

        word = this.clean(word)
        let r = word.split("").map((a) => this.vowels.includes(a) ? "V" : "C");
        if (returnType === "string")
            return r.join("");

        return r;
    }
    //
    // this checks for any kind of invalid input
    isValid(val) {
        if (val === undefined || val === null || val.indexOf("undefined") >= 0 || val.indexOf("null") >= 0)
            return false;
        return true;
    }
    //
    // Reverse array search
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
    // Move chars backwards/forward bettwen array's positions
    moveAround(arr, pos, char, direction) {

        const to = direction === "right" ? pos + 1 : pos - 1;
        const cutIndex = direction === "right" ? -1 : 1;
        // cut char from current slot
        arr[pos] = direction === "right" ? arr[pos].slice(0, cutIndex) : arr[pos].slice(cutIndex);
        // glue char to neighbor
        arr[to] = direction === "right" ? char + arr[to] : arr[to] + char;
        return arr;
    }

}
//
//
// Core methods extention
//
class coreFunctionsExt extends coreFunctions {

    constructor() { super(); }
    //
    // Given a word, returns it's structure (VOWEL + CONSONANT + VOWEL...) BUT WITH THE TYPE OF CONSONANT SPECIFIED
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
    //
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
class magikESpeller extends coreFunctionsExt {

    constructor() { super() }
    //  
    //Heuristic syllables spliter
    //
    splitInSyllables(word) {

        console.time("miScript");
        word = word.toLowerCase();

        let syllables = []; // syllables array, each position is a syllable
        let syllablesTmp = ""; // tmp array used to store consonants bettwen found vowels
        let wordAsArray = word.split(""); // word given as an array of letters
        let wordAsEstArray = this.getEst(word, "array"); // word est (eje : CVC) also as array

        // This adds a letter to tmp array
        const tmpAdd = (currentLetter) => { syllablesTmp += currentLetter; }
        // This push what's stored in tmp + current letter to syllables's array last position
        const tmpPush = (currentLetter) => { syllables.push(syllablesTmp + currentLetter); syllablesTmp = ""; }
        // this checks if we have reached the end of the word and push wht's left in tmp to sayllables 
        const emptyPush = () => tmpPush("");

        //Check if latest push to sylables makes any sense and in case it doesn't, it fixes
        const rulesApply = (syllables) => {

            const lastS = syllables[syllables.length - 1];
            const lasSEst = this.getEst(lastS);
            const lastLastS = syllables[syllables.length - 2] ?? false;

            if (!lastLastS) return syllables;

            const lastLetterLastlastS = lastLastS[lastLastS.length - 1];
            const firstLastS = lastS.slice(0, 1);
            const firstLetLastEst = this.getEst(firstLastS)

            let conjuntion = lastLastS + lastS;

            //Sanity check
            if (conjuntion.length > 3) conjuntion = conjuntion.slice(-3);

            // No syllable can be made of a consonant only If last letter from  prev syllable 
            // and first from current form a diphthong e join them together
            //
            if (lasSEst === "C" || (firstLetLastEst !== "C" && !!this.reverseSearch(conjuntion, this.diphthongs, true)))
                this.moveAround(syllables, syllables.length - 1, lastS, "left");

            //We check if there's a invalid 2 consonants syllable and fix it
            if (lasSEst.slice(0, 2) === "CC" && !this.isF2Valid(lastS)) {

                if (lastS == "ch" || lastS == "ll") {
                    syllables[syllables.length - 2] = syllables[syllables.length - 2] + lastS;
                    syllables.pop();
                    return syllables;
                }
                this.moveAround(syllables, syllables.length - 1, firstLastS, "left");
            }

            //Fixing invalid syllables endings
            if (this.forbiddenEnds.includes(lastLetterLastlastS) && !this.forbiddenEndsExc.includes(this.clean(lastLastS)))
                this.moveAround(syllables, syllables.length - 2, lastLetterLastlastS, "right");

            //Sanity check
            return syllables.filter((s) => s !== "");
        }
        //
        // Main method loop
        // Iterates each letter, if its a consonant, stores it in tmp array, if it's a vowel
        // saves it to syllables array, adding what's stored in tmp before it
        // it has rules to handle dipthongs and syllables that starts in vowel and end in consonant
        //
        const end = wordAsArray.length - 1;
        for (let index = 0; index <= end; index++) {

            const currentType = wordAsEstArray[index];
            const currentLetter = wordAsArray[index];

            if (currentType === "C") {

                tmpAdd(currentLetter);
                if (index === end) emptyPush();
                syllables.length > 0 ? syllables = rulesApply(syllables) : null;
                continue;
            }

            tmpPush(currentLetter);
            syllables = rulesApply(syllables);
        }

        console.timeEnd("miScript");
        return rulesApply(syllables);
    }

}

const spell = new magikESpeller();