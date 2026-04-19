This specification document outlines the technical architecture and functional requirements for the **Practice Maker** library. Given your focus on modularity and the "Book Style" aesthetic, this library is designed to be a lightweight, zero-CSS dependency tool that empowers educators.

---

# Specification Document: Practice Maker JS

## 1. Overview
**Practice Maker** is a client-side JavaScript library designed to render interactive educational assessments. It leverages **Bootstrap 5** for UI components and **KaTeX** for mathematical typesetting. It is built with a focus on modularity, allowing new question types to be integrated without core logic modification.

---

## 2. Technical Architecture

### 2.1 Core Responsibilities
* **DOM Injection:** Mounts to a provided root element.
* **State Management:** Tracks user answers, timer status, and current mode (Practice vs. Quiz).
* **Shuffling Engine:** Fisher-Yates shuffle implementation for both question order and choice order.
* **Typesetting:** Automatic detection and rendering of KaTeX expressions in `question` and `explanation` strings.

### 2.2 Modular Question Registry
To support future types (e.g., "Fill in the Blanks" or "Drag and Drop"), the library uses a Strategy Pattern.
* **Base Interface:** Each module must implement `render()`, `validate()`, and `getFeedback()`.
* **Existing Types:** `CHOOSE_THE_BEST`, `MULTI_CHOICE`, `MATCH_THE_FOLLOWING`, `TEXT_ANSWER`, `NUMBER_ANSWER`.

---

## 3. API Specification

### 3.1 Constructor
```javascript
new PracticeMaker(rootElement, options);
```
* **`rootElement`**: HTML element where the UI will be generated.
* **`options`**: Object containing:
    * `mode`: `PRACTICE` (default) or `QUIZ`.
    * `timer`: Number (seconds).
    * `maxSize`: Maximum number of questions to load from the bank.
    * `error`: Callback function for error handling.

### 3.2 Public Methods
| Method | Description |
| :--- | :--- |
| `setQuestions(data)` | Accepts JSON array, shuffles content, and initializes the first question. |
| `setEditable(bool)` | Enables/Disables CRUD overlays on the questions for content creators. |
| `next()` / `previous()` | Navigates between questions (Practice Mode only). |
| `submit()` | Ends the session and triggers the results summary. |

---

## 4. Functional Modes

### 4.1 PRACTICE Mode (Default)
Focuses on formative assessment and immediate feedback.
* **Verify Button:** Checks the current question's answer immediately.
* **Explanation Toggle:** Shows/Hides the `explanation` field using Bootstrap Collapse.
* **Navigation:** Forward and backward buttons are always enabled.

### 4.2 QUIZ Mode
Focuses on summative assessment and performance tracking.
* **Timer:** Displayed at the top. Auto-submits if time reaches zero.
* **Submit Button:** Finalizes all answers.
* **Result View:** Displays a paginated grid of question numbers.
    * **Green:** Correct.
    * **Red:** Incorrect.
    * **Gray:** Unanswered.

---

## 5. Question Type Specifics

### 5.1 Match the Following
* **Logic:** Users pair `choices` with `matches`.
* **Distractor Support:** If `matches.length > choices.length`, the extra matches act as distractors to increase difficulty.
* **UI:** Rendered as a two-column layout using Bootstrap list groups or select dropdowns.

### 5.2 Math Rendering (KaTeX)
The library automatically scans text for:
* **Inline:** `$ ... $`
* **Display:** `<div class="math-display"> ... </div>` or `$$...$$`

---

## 6. Implementation Example

### Data Structure (JSON)
The library expects the following schema for the `MATCH_THE_FOLLOWING` distractor logic:
```json
{
  "type": "MATCH_THE_FOLLOWING",
  "choices": [{ "label": "A", "id": "1" }],
  "matches": [
    { "label": "Correct Match", "id": "m1" },
    { "label": "Distractor", "id": "m2" }
  ]
}
```

### Modular Logic (Pseudocode)
```javascript
class PracticeMaker {
    constructor(root, options) {
        this.root = root;
        this.mode = options.mode || 'PRACTICE';
        this.questions = [];
        this.registry = {
            'CHOOSE_THE_BEST': new ChooseTheBestModule(),
            'MATCH_THE_FOLLOWING': new MatchFollowingModule()
        };
    }

    renderQuestion(index) {
        const q = this.questions[index];
        const module = this.registry[q.type];
        this.root.innerHTML = module.render(q);
        renderMathInElement(this.root); // KaTeX trigger
    }
}
```

---

## 7. UI Requirements (Bootstrap 5 Classes)
* **Buttons:** `.btn .btn-primary`, `.btn-outline-secondary`.
* **Feedback:** `.alert .alert-success` (Correct), `.alert-danger` (Wrong).
* **Pagination:** `.pagination .page-item` for Quiz mode results.
* **Cards:** Each question is wrapped in a `.card .shadow-sm`.

## 8. Tech Stack

### 1. Build Strategy (Rollup Configuration)
Your choice of **Rollup** is ideal for a library like this because it produces smaller, cleaner bundles compared to Webpack.

* **UMD Format:** Ensures the library works directly in the browser via `<script>` tags, making it easy for users to drop into any HTML page.
* **ESM Format:** Allows modern developers to `import { PracticeMaker } from 'practice-maker'` in their own build pipelines.
* **Source Maps:** Essential for debugging the minified library during development.

---

### 2. Recommended Rich Text Editor: **Quill.js**
For your `setEditable(true)` requirement, I highly recommend **Quill.js**. It aligns perfectly with your existing tech stack for several reasons:

#### Why Quill?
* **Modular Architecture:** You only import the features you need (bold, italic, list, etc.), keeping the footprint small.
* **Delta Format:** It stores content as a JSON object (Deltas) rather than messy HTML strings, making it easier to save and validate your questions.
* **Custom Blots:** You can create a "KaTeX Blot" that allows content creators to see rendered math equations directly inside the editor as they type.

#### Implementation Strategy for KaTeX:
Since you are already using KaTeX, you can use the **Quill Math** module. It provides a simple UI popup where users enter LaTeX, and it renders immediately.

```javascript
// Example Quill Configuration for Practice Maker
var quill = new Quill('#editor', {
  modules: {
    formula: true, // This enables KaTeX support
    toolbar: [['bold', 'italic', 'formula'], ['link', 'image']]
  },
  theme: 'snow'
});
```

---

### 3. Integrated Architecture
The diagram below illustrates how your Rollup-bundled library interacts with the DOM, the external data source, and the typesetting engine.



---

### 4. Technical Summary Table

| Layer | Technology | Reason |
| :--- | :--- | :--- |
| **Module Bundler** | Rollup.js | Efficient tree-shaking and multi-format (UMD/ESM) output. |
| **UI Framework** | Bootstrap 5 | Standardized components with no custom CSS overhead. |
| **Math Engine** | KaTeX | Fastest rendering speed; ideal for mobile/educational content. |
| **Editor (Optional)** | Quill.js | Modular, extensible, and has native KaTeX support. |
| **Data Format** | JSON | Universal compatibility with your Hugo/Markdown workflows. |
