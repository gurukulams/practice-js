# practice-js

**A personal learning tool.** Add questions on any topic, practice them, and share with others.

No accounts, no platform — just a JSON file of questions and a browser. You write the questions, embed the widget anywhere, and anyone with the link can practice. Works for any subject: programming, math, languages, exam prep.

**As a learner you can:**
- Add your own questions and answers
- Practice in free-form mode — check each answer, read the explanation
- Take a timed quiz and review what you got wrong
- Write personal notes per question (saved in your browser)
- Switch UI to Tamil

---

## Install as a dependency

Published to **GitHub Packages** as `@gurukulams/practice-js` (never to the public npm registry). GitHub Packages requires a token even for public packages, so point the scope at the right registry first:

```ini
# .npmrc
@gurukulams:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
export NODE_AUTH_TOKEN=<PAT with read:packages>   # in Actions: secrets.GITHUB_TOKEN
npm install @gurukulams/practice-js
```

## Develop & Build

```bash
npm install
npm run build       # → dist/practice.bundle.js (UMD) + dist/practice.esm.js
npm run watch       # dev server on http://localhost:3000
npx playwright test # run tests
```

## Releasing

No tags, no GitHub Releases. A push to `main` that changes `package.json`'s
version builds, tests, and publishes that version to GitHub Packages
automatically. If the version in `package.json` is already published, the
workflow is a no-op.

```bash
npm version patch      # bumps package.json and commits (use --no-git-tag-version to skip the tag)
git push
```

Playwright runs on every release but is currently **non-blocking** — the suite has pre-existing failures (hash navigation is only wired up in `EDIT` mode, and the default `complexity` filter hides the `TEXT_ANSWER`/`NUMBER_ANSWER` fixtures). Once those are fixed, drop `continue-on-error` from `.github/workflows/publish-package.yml` so a red suite blocks the release again.

## Usage

```html
<script src="dist/practice.bundle.js"></script>
<div id="root"></div>
<script>
  const pm = new PracticeMaker(document.getElementById('root'), {
    mode: 'PRACTICE', // 'PRACTICE' | 'QUIZ' | 'EDIT'
    timer: 60,        // seconds (QUIZ only)
    locale: 'en',     // 'en' | 'ta'
    error: (msg) => alert(msg)
  });
  pm.setQuestions(questionsArray);
</script>
```

## API

| Method | Description |
|--------|-------------|
| `setQuestions(arr)` | Load questions, start from Q1 |
| `setEditable(bool)` | Toggle edit mode (show/hide badge, enable textarea) |
| `destroy()` | Clear timers, clean up before re-init |

## Modes

| Mode | Behaviour |
|------|-----------|
| `PRACTICE` | Verify each answer individually, toggle explanation |
| `QUIZ` | Navigate freely, submit all at end, score + review grid |
| `EDIT` | Author questions inline |

## Question Types

| Type | Input |
|------|-------|
| `CHOOSE_THE_BEST` | Single radio |
| `MULTI_CHOICE` | Checkboxes |
| `MATCH_THE_FOLLOWING` | Drag-reorder rows |
| `TEXT_ANSWER` | Free text input |
| `NUMBER_ANSWER` | Numeric input |

## Questions JSON Schema

```json
[
  {
    "id": "unique-id",
    "type": "CHOOSE_THE_BEST",
    "question": "Which is correct?",
    "explanation": "Optional explanation shown after verify.",
    "choices": [
      { "id": "c0", "choice": "Option A", "answer": false },
      { "id": "c1", "choice": "Option B", "answer": true }
    ]
  },
  {
    "id": "text-q0",
    "type": "TEXT_ANSWER",
    "question": "What keyword defines a class in Java?",
    "answer": "class"
  },
  {
    "id": "num-q0",
    "type": "NUMBER_ANSWER",
    "question": "How many bits in a byte?",
    "answer": 8
  },
  {
    "id": "match-q0",
    "type": "MATCH_THE_FOLLOWING",
    "question": "Match the pattern to its intent.",
    "choices": [
      { "id": "c0", "choice": "Builder",    "match": "m0", "answer": true },
      { "id": "c1", "choice": "Decorator",  "match": "m1", "answer": true },
      { "id": "c2", "choice": "Visitor",    "match": null              }
    ],
    "matches": [
      { "id": "m0", "match": "Construct complex objects step by step" },
      { "id": "m1", "match": "Add behaviour without subclassing" }
    ]
  }
]
```

## Features

- **Personal notes** — collapsible textarea per question, saved to `localStorage`
- **i18n** — EN / Tamil UI labels via `locale` option; question content unchanged
- **KaTeX** — math rendering on MATCH labels
- **URL params** (playground) — `?mode=QUIZ`, `?timer=60`, `?editable=1`
- **Hash navigation** — `/#question-id` jumps to that question


## Loading Extrnal Questions

**Linux / macOS**
```bash
export QUESTIONS_FOLDER="<<DIR>>"
export PUBLIC_FOLDER="<<DIR>>" 
npm run watch:questions
```

**Windows (Cmd)**
```bash
set QUESTIONS_FOLDER=<<DIR>>
set PUBLIC_FOLDER=<<DIR>>
npm run watch:questions
```

## Science Question Paper Reference (2023 – 2026)

Board examination question papers for Science (`question_paper_reference/SCIENCE/`) are structured as:
- `questions/science/` — All 1-Mark Multiple Choice Questions (`CHOOSE_THE_BEST`), e.g., `<year>-q01.md` and `<year>-q01_ta.md`.
- `QUESTIONS.md` — Complete bilingual question bank containing all 2-mark, 4-mark, and 7-mark descriptive and numerical questions with model answers.

Every 1-mark question is bilingual: English (`<year>-qXX.md`) and Unicode Tamil (`<year>-qXX_ta.md`).

For full details, see the [Question Paper Guide](docs/question-paper-guide.md).

### Antigravity Skill: Question Paper Importer

This repo includes an Antigravity workspace skill at `.agents/skills/question-paper-importer/`.
- **Purpose:** Parse and import future question paper PDFs into the practice-js quiz markdown protocol.
- **Run the Importer:**
  ```bash
  python3 scripts/parse-science-paper.py --pdf <path-to-pdf> --year <year> --output-dir questions
  ```
- **Compile Questions:**
  ```bash
  npm run build:questions
  ```

## License

MIT
