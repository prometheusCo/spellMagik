

# magikEspellCheck

### Heuristic Spell-Checker for Spanish — 100% Browser-Native

**magikEspellCheck** is a lightweight, dictionary-driven spell corrector designed for **modern browsers**.
It uses **syllable-based heuristics** and **phonetic rules** of Spanish to detect and fix spelling errors, without needing any server or external library.

---

## ✨ Features

* **Fully Spanish-aware:** handles diphthongs, triphthongs, digraphs (*rr, ll, ch*), and legal consonant clusters.
* **Smart syllabifier:** splits words into syllables and repairs boundary errors automatically.
* **Heuristic suggestions:** uses vowel/consonant wildcards to guess likely words.
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

1. **Loads a dictionary** (plain, gzip, or base64) from the configured URL and caches it locally.
2. **Splits input words** into syllables using phonetic and structural rules.
3. **Generates candidate mutations** by swapping onsets, filling vowel/consonant wildcards, and testing nearby lengths.
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

* Always waits until the dictionary is ready.
* If the word is **valid**, it:

  * returns `true`, **and**
  * calls the callback with `[["word", 1]]`.
* If not, it:

  * generates candidates,
  * scores them, and
  * calls the callback with the top suggestions.

No Promises — pure callback flow.

---

## ⚡ Performance

* 2-level dictionary index (`a → ab → Set(words)`) for fast lookups.
* Typed arrays for edit-distance computation.
* First call “warm-start” compiles hot paths for low latency later.

---

## 🧱 License

MIT-style license (see source header).
Free for personal, educational, and commercial use — attribution required.
Cannot be sold as a standalone paid product.

---

## 🧩 Author

**© 2025 José Alejandro Palomo González**
Designed for high accuracy, low latency, and full browser compatibility.

---

Would you like me to make this version ready for direct GitHub rendering (Markdown-optimized with badges and section anchors)?
