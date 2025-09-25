//
// Core methods class
class coreFunctions {

    vowelsOpened = ['a', 'e', 'o'];
    vowelsClosed = ['i', 'u'];
    vowels = [...this.vowelsOpened, ...this.vowelsClosed];

    consonantsS = ['p', 't', 'k', 'b', 'd', 'g'];
    consonantsF = ['f', 's', 'j', 'z', 'c', 'y', 'll'];
    consonantsL = ['l', 'r'];

    accents = ['á', 'é', 'í', 'ó', 'ú'];

    diphthongs = [
        "ia", "ie", "io",
        "ua", "ue", "uo",
        "ai", "ei", "oi",
        "au", "eu", "ou",
        "iu", "ui"
    ];

    syllablesThatStartsWithVowel = [
        //A
        'an', 'amb', 'amp', 'al', 'arr', 'ar',
        //E
        'es', 'en', 'emp', 'en', 'err', 'er',
        //I
        'ins', 'im', 'in', 'or',
        //O
        'obs', 'os',
        //U
        'un'
    ];

    validSyllablesEst = ['CSCL', 'CFCL', 'dr', 'dl', 'ph', 'ps', 'rr', 'bl'];

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

        let r = false;
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

        syllablesEstAsArray = syllablesEstAsArray.map((s) => s.replaceAll("V", ""));
        syllabesAsArray = syllabesAsArray.map((s) => s.replaceAll(/a|e|i|o|u/g, ""));

        return [...syllablesEstAsArray].some((est, index) => {
            if (this.validSyllablesEst.includes(est) || this.validSyllablesEst.includes(syllabesAsArray[index]))
                return true;
            return false;
        })
    }
    //
    //
    hasAccent(vowel) { return this.accents.includes(vowel); }

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

            if (this.consonantsS.includes(wordAsArray[index])) return "CS";
            if (this.consonantsF.includes(wordAsArray[index])) return "CF";
            if (this.consonantsL.includes(wordAsArray[index])) return "CL";

            return "NN";

        });

    }
}

//
// Main class
class magikESpeller {


    constructor() {

        this.coreF = new coreFunctions();
        this.getEst = this.coreF.getEst;
        this.isValid = this.coreF.isValid;
        this.reverseSearch = this.coreF.reverseSearch;
        this.syllablesThatStartsWithVowel = this.coreF.syllablesThatStartsWithVowel;
        this.diphthongs = this.coreF.diphthongs;
        this.accents = this.coreF.accents;
        this.hasAccent = this.coreF.hasAccent;


        this.coreFunctionsExt = new coreFunctionsExt();
        this.getEstExt = this.coreFunctionsExt.getEstExt;

        this.vowels = this.coreF.vowels;
        this.consonantsS = this.coreF.consonantsS;
        this.consonantsF = this.coreF.consonantsF;
        this.consonantsL = this.coreF.consonantsL;
        this.validSyllablesEst = this.coreF.validSyllablesEst;

        this.isValidSyllablesEst = this.coreFunctionsExt.isValidSyllablesEst;
    }

    //  
    //Heuristic syllables spliter
    splitInSyllables(word) {

        console.time("miScript");

        let syllables = [], syllablesTmp = "";
        let wordAsArray = word.split("");
        let wordAsEstArray = this.getEst(word, "array");

        const tmpAdd = (currentLetter) => { syllablesTmp += currentLetter; }
        const tmpPush = (currentLetter) => { syllables.push(syllablesTmp + currentLetter); syllablesTmp = ""; }
        const emptyPush = (_pointerCalc) => { if (_pointerCalc === wordAsArray.length - 1) { tmpPush("") }; }

        const lastCharCheck = (_syllables) => {

            if (this.getEst(_syllables.at(-1)) !== "C")
                return syllables;

            _syllables[_syllables.length - 2] = _syllables.at(-2) + _syllables.at(-1);
            _syllables.pop();
            return _syllables;
        }

        const postProcessing = (syllables) => {

            syllables[syllables.length - 1] = syllables.at(-1).replaceAll("undefined", "");
            let r = lastCharCheck(syllables).filter((s) => s !== "");

            for (let x = 0; x < 2; x++) {

                r.forEach((syllabe, index) => {

                    let prevSyllable = r[index - 1] ?? false;
                    if (!prevSyllable)
                        return;

                    let prevLetter = prevSyllable.slice(prevSyllable.length - 1);
                    let prevSyllableEst = this.getEst(prevLetter);
                    let syllabeEst = this.getEst(syllabe);
                    let prevPrevLetter = prevSyllable.slice(prevSyllable.length - 2) ?? "";
                    let cutIndex = 1;

                    if (prevSyllableEst + syllabeEst !== "CV")
                        return;

                    if (prevPrevLetter === "rr") { prevLetter = "rr"; cutIndex = 2; }

                    r[index] = prevLetter + syllabe;
                    r[index - 1] = prevSyllable.slice(0, prevSyllable.length - cutIndex);

                })

            }
            r = r.filter((s) => s !== "");
            return r;
        }

        for (let index = 0; index < wordAsArray.length; index++) {

            let prevType = wordAsEstArray[index - 1] ?? "NN",
                currentLetter = wordAsArray[index],
                currentType = wordAsEstArray[index],
                nextLetter = wordAsArray[index + 1] ?? false,
                nextNextLetter = wordAsArray[index + 2] ?? "",
                pointerCalc = () => syllables.join("").length + syllablesTmp.length - 1;

            if (index <= pointerCalc())
                continue;

            if (currentType === "C") {

                tmpAdd(currentLetter);
                if (index === wordAsArray.length - 1) { tmpPush("") }
                continue;
            }

            if (!nextLetter) { tmpPush(currentLetter); continue; }

            let probJointSyllable2 = currentLetter + nextLetter;
            let probJointSyllable3 = currentLetter + nextLetter + nextNextLetter;
            let reverseSearchResult2 = this.reverseSearch((probJointSyllable2), this.syllablesThatStartsWithVowel, true);
            let reverseSearchResult3 = this.reverseSearch((probJointSyllable3), this.syllablesThatStartsWithVowel, true);
            let reverseResult = !reverseSearchResult3 ? reverseSearchResult2 : reverseSearchResult3;

            let probJointSyllable = this.diphthongs.includes(probJointSyllable3) ? probJointSyllable3 :
                (this.diphthongs.includes(probJointSyllable2) ? probJointSyllable2 : false);

            if ((!probJointSyllable && !reverseResult) && !probJointSyllable) {
                tmpPush(currentLetter); continue;
            }

            let leftoverPointer = (pointerCalc() + reverseResult.length) === (word.length);

            if (reverseResult !== false && !probJointSyllable) {

                if (leftoverPointer)
                    reverseResult = reverseResult.slice(0, reverseResult.length - 1)
                tmpPush(reverseResult); continue;
            }

            leftoverPointer = (pointerCalc() + probJointSyllable.length) + 2 === (word.length - 1);

            if (!probJointSyllable || this.hasAccent(currentLetter)) { emptyPush(pointerCalc()); continue; }

            !leftoverPointer ? probJointSyllable += nextNextLetter : probJointSyllable;

            if (!leftoverPointer) {

                let lastEst = this.getEst(word.slice((pointerCalc() + probJointSyllable.length)));
                let lastChars = word.slice((pointerCalc() + probJointSyllable.length));
                let lastEstExt = this.getEstExt(word.slice((pointerCalc() + probJointSyllable.length)));

                lastChars = lastChars.replaceAll(/a|e|i|o|u/g, "");
                lastEstExt = lastEstExt.includes("V") ? lastEstExt.join("").split("V")[0] : lastEstExt.join("");

                if (lastEst === "CVC" || this.isValidSyllablesEst([lastEstExt], [lastChars]))
                    probJointSyllable = probJointSyllable.slice(0, probJointSyllable.length - 1)
            }
            tmpPush(probJointSyllable);

        }
        console.timeEnd("miScript"); console.log("raw result"); console.log(syllables);
        return postProcessing(syllables);
    }

}

const spell = new magikESpeller();