//
// Core methods class
class coreFunctions {

    vowelsOpened = ['a', 'e', 'o'];
    vowelsClosed = ['i', 'u'];
    vowels = [...this.vowelsOpened, ...this.vowelsClosed];

    consonantsO = ['p', 't', 'k', 'b', 'd', 'g'];
    consonantsF = ['f', 's', 'j', 'z', 'c', 'y', 'll'];
    consonantsL = ['l', 'r'];

    syllablesThatStartsWithVowel = [
        //A
        'a', 'an', 'amb', 'amp', 'al', 'arr', 'ar',
        //E
        'es', 'en', 'emp', 'en', 'err', 'er',
        //I
        'ins', 'im', 'in',
        //O
        'obs', 'os',
        //U
        'un'
    ];

    validSyllablesEst = ['COCL', 'CFCL', 'dr', 'dl', 'ph', 'ps'];

    constructor() { };

    //
    // Given a word, returns it's structure (VOWEL + CONSONANT + VOWEL...)
    getEst(word, returnType = "string") {

        let r = word.split("").map((a) => this.vowels.includes(a) ? "V" : "C");
        if (returnType === "string")
            return r.join("");

        return r;
    }

    //
    //
    isValid(val) {
        if (val === undefined || val === null || val.indexOf("undefined") >= 0 || val.indexOf("null") >= 0)
            return false;
        return true;
    }

    //
    // Reverse array search
    reverseSearch(word, array, loose = false) {

        let r = false; console.log("=>" + word); console.log(array);
        array.some((a) => {
            if ((word.indexOf(a) >= 0 && loose) || (word === a)) {
                r = a; return true;
            }
        })
        return r;
    }

    //
    //
    isValidSyllablesEst(syllablesEstAsArray, syllabesAsArray) {

        return [...syllablesEstAsArray].forEach((est, index) => {
            if (validSyllablesEst.includes(est) || this.validSyllablesEst.includes(syllabesAsArray[i]))
                return true;
            return false;
        })
    }

}

//
// Core methods extention
class coreFunctionsExt extends coreFunctions {

    constructor() { super(); }

    //
    // Given a word, returns it's structure (VOWEL + CONSONANT + VOWEL...) BUT WITH THE TYPE OF CONSONANT SPECIFIED
    getEstExt(word, returnType = "array") {

        let wordAsArray = word.split("");
        return super.getEst(word, returnType).map((est, index) => {

            if (est === "V") return "V";

            if (this.consonantsO.includes(wordAsArray[index])) return "CO";
            if (this.consonantsF.includes(wordAsArray[index])) return "CF";
            if (this.consonantsL.includes(wordAsArray[index])) return "CL";

        });

    }
}

//
// Main class
class magikSpeller {


    constructor() {

        this.coreF = new coreFunctions();
        this.getEst = this.coreF.getEst;

        this.coreFunctionsExt = new coreFunctionsExt();
        this.getEstExt = this.coreFunctionsExt.getEstExt;

        this.vowels = this.coreF.vowels;
        this.consonantsO = this.coreF.consonantsO;
        this.consonantsF = this.coreF.consonantsF;
        this.consonantsL = this.coreF.consonantsL;

        this.isValidSyllablesEst = this.coreFunctionsExt.isValidSyllablesEst;
    }

    //
    //Heuristic syllables spliter
    splitInSyllables(word) {
        console.time("miScript");

        let syllables = [], syllablesTmp = [], pointer = 0;
        let wordAsArray = word.split("");
        let wordAsEstArray = this.getEst(word, "array");


        wordAsEstArray.forEach((type, index) => {

            if (type === "V") {

                syllables.push(word.slice(pointer, (index + 1))); pointer = index + 1;
                syllablesTmp = []; return;
            }
            syllablesTmp.push(wordAsArray[index]);

            if (wordAsEstArray[index + 1] === "V" && syllablesTmp.length > 0) {

                let probSyllableStartsWithV = syllables.at(-1) + syllablesTmp.join("");

                // We purge non valid syllabes
                if (!this.isValid(probSyllableStartsWithV) || this.getEst(probSyllableStartsWithV[0]) === "C")
                    return;

                let reverseSearchResult = this.reverseSearch(probSyllableStartsWithV, this.syllablesThatStartsWithVowel, true); console.log(reverseSearchResult);
                // We check if the probable syllable that starts with a vowel exits in array syllablesThatStartsWithVowel
                // And the result given by reverse Search its valid
                if (reverseSearchResult !== false && this.getEst(reverseSearchResult, "array")[0] !== "C") {
                    syllables[syllables.length - 1] = reverseSearchResult;
                    pointer = syllables.join("").length;
                }
            }

        });
        syllables[syllables.length - 1] = syllables.at(-1) + syllablesTmp.join("");
        console.timeEnd("miScript");
        return syllables.filter((a) => a !== undefined);

    }

}

const spell = new magikSpeller();