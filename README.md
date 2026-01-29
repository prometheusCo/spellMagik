# magikEspellCheck

### Corrector ortográfico heurístico para español — 100% nativo

### ATENCIÓN: TRABAJO EN PROGRESO, ¡INTENTARÉ ACTUALIZAR ESTO DIARIAMENTE PARA TENERLO LISTO PRONTO!

**magikEspellCheck** es un corrector ortográfico ligero que usa diccionario, diseñado para navegadores modernos.  
Utiliza heurísticas basadas en sílabas y reglas fonéticas del español para detectar y corregir errores ortográficos, sin necesidad de servidor ni bibliotecas externas.

---

## Características

* **Sugerencias heurísticas:** usa reglas de vocal/consonante y expresiones regulares para adivinar palabras probables.
* **Similitud ponderada:** distancia de edición personalizada ajustada a los patrones ortográficos del español.
* **Caché offline:** el diccionario se carga una vez y se almacena en `localStorage`.
* **Cero dependencias:** solo JavaScript vanilla.

---

## Uso rápido

```js

const spell = new magikEspellCheck();

// Llama a tu callback tanto si la palabra es correcta como si no
spell.correct("holla", suggestions => {
  console.log(suggestions); // [["hola", 0.93], ["olla", 0.87], ...]
});

// Devuelve true inmediatamente si la palabra existe en el diccionario
const ok = spell.correct("hola", suggestions => {
  if (ok) console.log("¡La palabra es correcta!");
});

```

---

## Cómo funciona

1. **Carga un diccionario** (plano o gzip) desde la URL configurada y lo almacena localmente.
2. **Divide las palabras** de entrada en sílabas usando reglas fonéticas y estructurales.
3. **Genera mutaciones candidatas** usando reglas heurísticas y patrones de expresiones regulares.
4. **Puntúa todos los candidatos** con una función de distancia de edición ponderada y devuelve las mejores coincidencias.

---

## Configuración

Puedes ajustar los parámetros clave dentro de la clase:

| Propiedad            | Valor por defecto    | Descripción                      |
| -------------------- | ------------------- | -------------------------------- |
| `dictionaryUrl`      | *(URL pública repo)*| Archivo de diccionario remoto    |
| `epochs`             | 3                   | Máx. pasadas de reparación silábica|
| `stringDiff`         | 0.7                 | Puntaje mínimo de similitud      |
| `maxNumSuggestions`  | 10                  | Límite de sugerencias            |
| `warmStart`          | true                | Precarga JIT y caché             |

---

## Comportamiento de `correct()`

```js
spell.correct(word, callback)
```

* Si la palabra es **válida**:

  * devuelve `true`, **y**
  * llama al callback con el resultado.

* Si no es válida:

  * genera candidatos,
  * los puntúa, y
  * llama al callback con las mejores sugerencias.

---

## Rendimiento

* Índice tipo árbol de 2 niveles para búsquedas rápidas (`abu → (abue..a) → [pool] `).
* Uso de arrays tipados para cálculo veloz de distancias de edición.
* La primera llamada “calienta” y compila rutas de ejecución para baja latencia posterior.
* La búsqueda de sugerencias promedio va entre 0.0006 y 0.004 segundos.

---

#
#

## magikEspellCheck

### Heuristic Spell-Checker for Spanish — 100% Browser-Native

### ATENTION: WORK IN PROGRESS, I'LL TRY TO UPDATE THIS IT EVERY DAY SO I CAN HAVE IT PROD READY SOON!!!

**magikEspellCheck** is a lightweight, dictionary-driven spell corrector designed for modern browsers.  
It uses syllable-based heuristics and phonetic rules of Spanish to detect and fix spelling errors, without needing any server or external library.

---

## Features

* **Heuristic suggestions:** uses vowel/consonant rules and reg Exps to guess likely words.
* **Weighted similarity:** custom edit distance tuned for Spanish spelling patterns.
* **Offline cache:** dictionary loads once and stays in `localStorage`.
* **Zero dependencies:** pure browser JavaScript.

---

## Quick Use

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

## How It Works

1. **Loads a dictionary** (plain or gzip) from the configured URL and caches it locally.
2. **Splits input words** into syllables using phonetic and structural rules.
3. **Generates candidate mutations** using heuristic rules and reg Exp patterns.
4. **Scores all candidates** with a weighted edit-distance function and returns the top matches.

---

## Configuration

You can adjust key parameters inside the class:

| Property            | Default             | Description                |
| ------------------- | ------------------- | -------------------------- |
| `dictionaryUrl`     | *(public repo URL)* | Remote dictionary file     |
| `epochs`            | 3                   | Max syllable-repair passes |
| `stringDiff`        | 0.7                 | Minimum similarity score   |
| `maxNumSuggestions` | 10                  | Limit of suggestions       |
| `warmStart`         | true                | Pre-warms JIT and cache    |

---

## Behavior of `correct()`

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

## Performance

* 2 - level tree LIKE dictionary index (`abu → (abue..a) → [pool] `) for fast lookups.
* Typed arrays for fast edit-distance computation.
* First call “warm-start” compiles hot paths for low latency later.
* Avg suggestion look up is betwen 0.0006 and 0.004 segs

---



