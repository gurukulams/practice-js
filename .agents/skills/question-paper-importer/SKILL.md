---
name: question-paper-importer
description: >-
  Use this skill to import, parse, and segregate board examination question papers
  (such as Tamil Nadu SSLC Science) from PDF into the practice-js quiz markdown format.
  Supports marks-based segregation (1-mark, 2-marks, 4-marks, 7-marks), bilingual English
  and Tamil transcription, and build-questions validation.
---

# Question Paper Importer Skill

This skill provides an automated, standardized runbook and toolset to parse board examination question papers from PDF format and convert them into the **practice-js** quiz protocol.

---

## 1. Directory Structure & Organization Convention

Science question papers are organized cleanly by target application:

1. **1-Mark Questions (`questions/science/`)**:
   - All 1-mark multiple choice questions (MCQ / `CHOOSE_THE_BEST`) from all exam years are placed directly in `questions/science/`.
   - Naming follows sequential IDs: `q01.md`, `q01_ta.md` through `q48.md`, `q48_ta.md`.
   - File names strictly follow `VALID_FILENAME_REGEX` (`/^[a-z0-9]+(-[a-z0-9]+)*(_[a-z]{2})?$/`).

2. **2-Marks, 4-Marks, and 7-Marks Questions (`QUESTIONS.md`)**:
   - All descriptive questions (Part II Short Answer, Part III Medium Answer, and Part IV Long Answer with internal choice) are compiled into the root `QUESTIONS.md`.
   - Each entry contains complete bilingual prompts, exam year and question ID metadata, and collapsible model answers / derivations within `<details>` blocks.

```text
questions/
└── science/
    ├── q01.md        # Part I (MCQ / CHOOSE_THE_BEST)
    ├── q01_ta.md     # Tamil localization
    ├── q02.md
    └── ...

QUESTIONS.md          # Complete repository of 2-mark, 4-mark & 7-mark questions
```


---

## 2. Quiz Protocol Specification

### A. 1-Mark Questions (MCQ / CHOOSE_THE_BEST)
- **Frontmatter**:
  - `complexity`: `"M"` or `"H"`
  - `tags`: List of strings (e.g., `["science", "physics", "1-mark"]`)
  - `choices`: List of distractor choices
  - `answers`: List containing the single correct answer
- **Body**:
  - `## <Question Title>`
  - `---` separator
  - Explanation or solution

### B. 2, 4, and 7-Mark Questions (Descriptive / Short & Long Answer)
- **Frontmatter**:
  - `complexity`: `"M"` (2, 4 marks) or `"H"` (7 marks)
  - `tags`: List of strings (e.g., `["science", "2-marks"]`)
- **Body**:
  - `## <Question Title>` (including sub-questions and internal choice `(a)` / `(b)` for 7 marks)
  - `---` separator
  - Complete model answer, step-by-step mathematical derivation, or tabular comparison

### C. Bilingual Support (`_ta.md`)
- Every English question `qXX.md` is accompanied by its Tamil counterpart `qXX_ta.md`.
- Tamil content is transcribed into **standard Unicode UTF-8**.
- Legacy font encoding (e.g., Shree-Lipi 8-bit characters in government question papers) is decoded using `tamil.txt2unicode.shreelipi2unicode`.

---

## 3. Usage & Execution

### Running the Importer
To import all reference question papers:
```bash
python3 .agents/skills/question-paper-importer/scripts/import_papers.py
```

To parse an individual question paper PDF:
```bash
python3 .agents/skills/question-paper-importer/scripts/parse_science_paper.py \
  --pdf question_paper_reference/SCIENCE/2023.pdf \
  --year 2023 \
  --output-dir questions
```

### Compiling and Validating Questions
Run the build script to validate schemas and generate output JSON files:
```bash
npm run build:questions
```

The output JSON bundles are written to `dist/data/science/`:
- `questions.json` (English)
- `questions_ta.json` (Tamil)
- `sub-questions.json` (Directory navigation index)


---

## 4. Verification Checklist

Before committing new imported questions:
1. Verify that all 35 questions per year exist for both English (`.md`) and Tamil (`_ta.md`).
2. Run `npm run build:questions` and confirm that all JSON files generate with zero errors.
3. Check mathematical formulas to ensure standard LaTeX formatting with single `$...$` (inline) or `$$...$$` (display).
