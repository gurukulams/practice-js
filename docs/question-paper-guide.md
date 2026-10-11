# Science Board Question Paper Reference & Importer Guide

This guide describes how board examination question papers (e.g., Tamil Nadu SSLC Science) are organized, segregated into practice-js markdown files, and compiled into practice JSON bundles.

---

## 1. Segregation Structure

Science question papers are organized cleanly by target usage:

- **1-Mark Questions (`questions/science/`)**:
  - All 1-mark multiple choice questions (MCQ / `CHOOSE_THE_BEST`) from all exam years are placed directly in `questions/science/`.
  - Naming follows `<year>-q01.md`, `<year>-q01_ta.md` up to `<year>-q12.md`.
  - Automatically compiled into `dist/data/science/questions.json` and `questions_ta.json`.

- **2-Marks, 4-Marks, and 7-Marks Questions (`QUESTIONS.md`)**:
  - All descriptive questions (Parts II, III, and IV) across all years are organized comprehensively in the root [QUESTIONS.md](../QUESTIONS.md) file with bilingual prompts and expandable model answers.


---

## 2. File Format & Protocol

### 1-Mark MCQ Format (`qXX.md`)

```markdown
---
complexity: "M"
tags:
  - science
  - physics
  - 1-mark
choices:
  - Option A
  - Option B
  - Option C
answers:
  - Correct Answer
---

## Question text goes here

---

Step-by-step solution or explanation.
```

### Descriptive Format (2, 4, 7 Marks) (`qXX.md`)

```markdown
---
complexity: "M"
tags:
  - science
  - physics
  - 2-marks
---

## Question prompt

---

### Model Answer
Complete textbook solution and explanation.
```

### Bilingual Support (`qXX_ta.md`)

Each question has an exact Tamil counterpart named with the `_ta` suffix (e.g. `q01_ta.md`).
- All Tamil text is in standard **Unicode UTF-8**.
- Frontmatter keys must match the base English file.
- Choices and answers in `qXX_ta.md` correspond to the translated options.

---

## 3. How to Run the Importer

### Re-generating all Years (2023, 2024, 2025, 2026)
```bash
python3 .agents/skills/question-paper-importer/scripts/import_papers.py
```

### Parsing a New Question Paper PDF
```bash
python3 scripts/parse-science-paper.py \
  --pdf question_paper_reference/SCIENCE/2023.pdf \
  --year 2023 \
  --output-dir questions
```

### Compiling Questions
```bash
npm run build:questions
```
This builds JSON bundles into `dist/data/science/<year>/<marks>/`:
- `questions.json` (English)
- `questions_ta.json` (Tamil)
- `sub-questions.json` (Navigation hierarchy)

---

## 4. Antigravity Skill Reference

An Antigravity skill is included at `.agents/skills/question-paper-importer/`:
- **Name:** `question-paper-importer`
- **Specification:** Follows the Antigravity Customization standard (`SKILL.md`, `scripts/`, `references/`, `examples/`).
- **Activation:** The agent activates this skill whenever you ask to import, parse, or update exam question paper PDFs.
