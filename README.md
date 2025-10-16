

# magikEspellCheck

### Heuristic Spell-Checker for Spanish — 100% Browser-Native

### ATENTION: WORK IN PROGRESS, I'LL TRY TO UPDATE THIS IT EVERY DAY SO I CAN HAVE IT PROD READY SOON!!!


**magikEspellCheck** is a lightweight, dictionary-driven spell corrector designed for **modern browsers**.
It uses **syllable-based heuristics** and **phonetic rules** of Spanish to detect and fix spelling errors, without needing any server or external library.

---

## ✨ Features

* **Heuristic suggestions:** uses vowel/consonant rules and reg Exps to guess likely words.
* **Weighted similarity:** custom edit distance tuned for Spanish spelling patterns.
* **Offline cache:** dictionary loads once and stays in `localStorage`.
* **Zero dependencies:** pure browser JavaScript.

---

## 🚀 Quick Use

```js
const spell = new magikEspellCheck();

// Will call your callback whether the word is correct or not
spell.correct("holla", suggestions => {
  console.log(suggestions); // [["hola", 0.93], ["olla", 0.87], ...]
});

// Returns true immediately if the word exists in the dictionary
const ok = spell.correct("hola", suggestions => {
  if (ok) console.log("Word is correct!");
});
```

---

## ⚙️ How It Works

1. **Loads a dictionary** (plain or  gzip) from the configured URL and caches it locally.
2. **Splits input words** into syllables using phonetic and structural rules.
3. **Generates candidate mutations** using heuristic rules and reg Exp patterns.
4. **Scores all candidates** with a weighted edit-distance function and returns the top matches.

---

## 🔧 Configuration

You can adjust key parameters inside the class:

| Property            | Default             | Description                |
| ------------------- | ------------------- | -------------------------- |
| `dictionaryUrl`     | *(public repo URL)* | Remote dictionary file     |
| `epochs`            | 3                   | Max syllable-repair passes |
| `stringDiff`        | 0.7                 | Minimum similarity score   |
| `maxNumSuggestions` | 10                  | Limit of suggestions       |
| `warmStart`         | true                | Pre-warms JIT and cache    |

---

## 🧠 Behavior of `correct()`

```js
spell.correct(word, callback)
```

* If the word is **valid**, it:

  * returns `true`, **and**
  * calls the callback with the result.

* If it's not valid
  
  * generates candidates,
  * scores them, and
  * calls the callback with the top suggestions.

---

## ⚡ Performance

* 2 - level three LIKE dictionary index (`abu → (abue..a) → [pool] `) for fast lookups.
* Typed arrays for fast edit-distance computation.
* First call “warm-start” compiles hot paths for low latency later.
* Avg suggestion look up is betwen 0.002 and 0.005 segs

---

## 🧱 License

MIT-style license (see source header).
Free for personal, educational, and commercial use — attribution required.
Cannot be sold as a standalone paid product.

---

## 🧩 Author

**© 2025 José Alejandro Palomo González**
Designed for high accuracy, low latency, and full browser compatibility.


