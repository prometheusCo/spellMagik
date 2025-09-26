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
        "ia", "ie", "io", 'uei',
        "ua", "ue", "uo",
        "ai", "ei", "oi",
        "au", "eu", "ou",
        "iu", "ui", "ai"
    ];

    diphthongsExceptions = ["uí", "üí"]

    syllablesThatStartsWithVowel = [
        //A
        'an', 'amb', 'amp', 'al', 'arr', 'ar', 'ads',
        //E
        'es', 'en', 'emp', 'en', 'err', 'er',
        //I
        'ins', 'im', 'in', 'or',
        //O
        'obs', 'os', 'on',
        //U
        'un'
    ];

    validSyllablesEst = ['CSCL', 'CFCL', 'CSVCL', 'CFC',

        'dr', 'dl', 'ph', 'ps', 'rr', 'bl', 'ch', 'll', 'rr', 'br', 'tl', 'tr',
        "pl", "cl", "fl", "gl",
        "pr", "br", "cr", "fr", "gr"
    ]

    validJoints = ["bs", "ns", "nd", "rs", "ll"];

    invalidEnds = ["ch", "ll"]

    constructor() { };

    clean = s => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

    isCapitalized = word => /^[A-ZÁÉÍÓÚÑÜ]/.test(word);

    capitalize = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

    pos = n => n < 0 ? n * (-1) : n;

    insertAfterIndex(arr, index, value) {
        arr.splice(index + 1, 0, value);   // mutates arr
        return arr;
    }

    //
    // Given a word, returns it's structure (VOWEL + CONSONANT + VOWEL...)
    getEst(word, returnType = "string") {

        let r = word.split("").map((a) => this.vowels.includes(this.clean(a)) ? "V" : "C");
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
    // Gives true if structure given is a valid spanish syllable est
    isValidSyllablesEst(syllablesEstAsArray, syllabesAsArray) {

        return [...syllablesEstAsArray].some((est, index) => {

            if (this.validSyllablesEst.includes(est) || this.validSyllablesEst.includes(syllabesAsArray[index]))
                return true;

            if (this.validSyllablesEst.includes(est.split("V")[0]))
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

            return "C";

        });

    }
}

//
// Main class
class magikESpeller extends coreFunctionsExt {


    constructor() { super() }
    //  
    //Heuristic syllables spliter
    splitInSyllables(word) {

        const cap = this.isCapitalized(word) ? true : false;
        const isupc = cap && (word.charAt(word.length - 1).toLowerCase() !== word.charAt(word.length - 1)) ? true : false;
        word = word.toLowerCase();
        console.time("miScript");

        let syllables = []; // syllabes array, each position is a syllable
        let syllablesTmp = ""; // tmp array used to store consonants bettwen found vowels
        let wordAsArray = word.split(""); // word given as an array of letters
        let wordAsEstArray = this.getEst(word, "array"); // word est (eje : CVC) also as array

        // This adds a letter to tmp array
        const tmpAdd = (currentLetter) => { syllablesTmp += currentLetter; }

        // This push what's stored in tmp + current letter to syllables's array last position
        const tmpPush = (currentLetter) => { syllables.push(syllablesTmp + currentLetter); syllablesTmp = ""; }

        // this checks if we have reached the end of the word and push wht's left in tmp to sayllables 
        const emptyPush = (_pointerCalc) => { if (_pointerCalc === wordAsArray.length - 1) { tmpPush("") }; }

        // this fixes some problems with last chars 
        const lastCharCheck = (_syllables) => {

            if (this.getEst(_syllables.at(-1)) !== "C")
                return syllables;

            _syllables[_syllables.length - 2] = _syllables.at(-2) + _syllables.at(-1);
            _syllables.pop();
            return _syllables;
        }
        // This fixes wrong syllables that are made of one vowel, by moving letters around it does 2 loops but you
        // can make it to loop N times just to be 100% sure
        const postProcessing = (syllables) => {

            syllables[syllables.length - 1] = syllables.at(-1).replaceAll("undefined", "");
            let r = lastCharCheck(syllables).filter((s) => s !== "");

            console.log(r);
            for (let x = 0; x < 2; x++) {

                r.forEach((syllable, index) => {

                    let prevSyllable = r[index - 1] ?? false;
                    if (!prevSyllable)
                        return;

                    let prevLetter = prevSyllable.slice(prevSyllable.length - 1) ?? "";
                    let prevSyllableEst = this.getEst(prevLetter);
                    let syllabeEst = this.getEst(syllable);
                    let prevPrevLetter = prevSyllable.slice(prevSyllable.length - 2) ?? "";
                    let cutIndex = 1;
                    let isValidEst = this.isValidSyllablesEst([this.getEstExt(syllable).join("")], [syllable]);
                    let isValidEstVar1 = this.isValidSyllablesEst([this.getEstExt(syllable.slice(1)).join("")], [syllable]);

                    if (!isValidEst && isValidEstVar1 ||
                        (this.reverseSearch(prevLetter + syllable.slice(0, 1), this.validJoints) && !isValidEst)) {

                        r[index] = syllable.slice(1);
                        r[index - 1] = r[index - 1] + syllable.slice(0, 1);
                        return;
                    }

                    if (!this.diphthongs.includes(syllable) && prevSyllableEst + syllabeEst !== "CV" && prevSyllableEst + syllabeEst !== "CVC" && (prevLetter + syllable.slice(0, 1) !== "rr"))
                        return;

                    if (prevPrevLetter === "rr") { prevLetter = "rr"; cutIndex = 2; }

                    r[index] = prevLetter + syllable;
                    r[index - 1] = prevSyllable.slice(0, prevSyllable.length - cutIndex);
                })
            }

            r = r.filter((s) => s !== "");

            if (this.invalidEnds.includes(r.at(-1))) {
                r[r.length - 2] = r[r.length - 2] + r.at(-1); r.pop();
            }

            return r;
        }

        //
        // Main method loop
        // Iterates each letter, if its a consonant, stores it in tmp array, if it's a vowel
        // saves it to syllables array, adding what's stored in tmp before it
        // it has rules to handle dipthongs and syllables that starts in vowel and end in consonant
        //
        for (let index = 0; index < wordAsArray.length; index++) {

            let prevType = wordAsEstArray[index - 1] ?? "NN",
                currentLetter = wordAsArray[index],
                currentType = wordAsEstArray[index],
                nextLetter = wordAsArray[index + 1] ?? false,
                prevLetter = wordAsArray[index - 1] ?? "",
                nextNextLetter = wordAsArray[index + 2] ?? "",
                pointerCalc = () => syllables.join("").length + syllablesTmp.length - 1;
            // code above calcs current pointer
            // the pointer is the last pos of what's already splited in syllables

            const leftoverCalc = length => (pointerCalc() + length) === (word.length);

            // This prevents adding again already added letters to syllables array when the pointer is moved forward 
            // after a dipthong or a syllable that starts in vowel is found

            if (index <= pointerCalc())
                continue;

            // Early negative return for when the current letter is a consonant
            if (currentType === "C") {

                //
                // => Adding current consonant to tmp  so it can be prepended to next's vowel's syllable  when found
                tmpAdd(currentLetter);
                if (index === wordAsArray.length - 1) { tmpPush("") }
                continue;
            }

            // Early negative return for when there's no next letter
            // Bellow code is for checking dipthongs and  syllables starting in vowels...
            if (!nextLetter) { tmpPush(currentLetter); continue; }

            //
            //Here we form posible candidates for dipthongs and  syllables that starts...
            //
            let probJointSyllable2 = currentLetter + nextLetter; // in, ar, or, al type of syllables
            let probJointSyllable3 = currentLetter + nextLetter + nextNextLetter; // ins, amp, amb... type of syllables
            //
            //here we store the results for  reverse searches, if nothing found var is false
            let reverseSearchResult2 = this.reverseSearch((probJointSyllable2), this.syllablesThatStartsWithVowel, true);
            let reverseSearchResult3 = this.reverseSearch((probJointSyllable3), this.syllablesThatStartsWithVowel, true);

            // global result for reverse searches: if a reverse search with 3 letter is found we take that as the
            // global result, otherwise we take the reverseSearchResult for 2 letters (something or false)
            let reverseResult = !reverseSearchResult3 ? reverseSearchResult2 : reverseSearchResult3;

            // Same as above but with the types of dipthongs
            let probJointSyllable = this.diphthongs.includes(this.clean(probJointSyllable3)) ? probJointSyllable3 :
                (this.diphthongs.includes(this.clean(probJointSyllable2)) ? probJointSyllable2 : false);

            //
            // === > Early negative return for cases in wich no dipthong or syllable that starts in vowel is found
            // in those cases we added this vowel to the syllables array prepending current tmp data and skip 
            //
            if ((!probJointSyllable && !reverseResult)) {

                if (nextLetter === nextNextLetter && nextLetter !== "l" && nextLetter !== "r")
                    currentLetter += nextNextLetter;


                if (this.getEst(nextLetter) === "C" && this.getEst(nextNextLetter) === "C" &&
                    this.getEst(prevLetter) !== "V" && nextLetter !== nextNextLetter &&
                    !this.validSyllablesEst.includes(nextLetter + nextNextLetter))
                    currentLetter += nextLetter;

                tmpPush(currentLetter);
                continue;
            }

            // this is kind of tricky: is used to know wether we have reach the probable end
            // in case of forming a syllable that starts in vowel.
            let leftoverPointer = leftoverCalc(reverseResult.length);

            //
            // === > Pushing the syllable that starts in vowel to global result array and skiping  the rest
            //
            if (reverseResult !== false && !probJointSyllable) {

                if (leftoverPointer)
                    reverseResult = reverseResult.slice(0, reverseResult.length - 1)

                if (reverseResult[0] !== currentLetter)
                    reverseResult = currentLetter + reverseResult;

                if ((this.getEst(reverseResult) === "VVC") && !this.reverseSearch(reverseResult, this.diphthongs, true))
                    reverseResult = reverseResult.slice(0, 1)

                tmpPush(reverseResult);
                continue;
            }

            // Same as previous example but for dipthongs
            leftoverPointer = leftoverCalc(probJointSyllable.length);

            //
            // === >  If an accent is found in any vowel in the dipthong, we treat it as a normal syllable and skip
            //
            if (!probJointSyllable || (probJointSyllable.includes("í")
                || probJointSyllable.includes("ú")) && !this.diphthongsExceptions.includes(probJointSyllable)) {

                if (this.hasAccent(currentLetter) || this.hasAccent(nextLetter)) {

                    probJointSyllable = probJointSyllable.split("")[0];
                    tmpPush(probJointSyllable);
                    continue;

                }

                emptyPush(pointerCalc());
                continue;
            }

            if (probJointSyllable.length === 3)
                nextNextLetter = wordAsArray[index + 3] ?? "";

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
        console.timeEnd("miScript");
        if (cap)
            syllables[0] = this.capitalize(syllables[0]);

        if (isupc)
            syllables = syllables.map((s) => s.toUpperCase());

        return postProcessing(syllables);
    }

}

const spell = new magikESpeller();