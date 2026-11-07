# Repository Guidelines & Content Management Skills

This repository contains questions and answers formatted according to the syntax defined in the [Gurukulams Design System Practices](https://designsystem.gurukulams.com/docs/practices).

### File Naming Convention

* **Default (English):** `{id}.md` (e.g., `1.md`)
* **Localized Versions:** `{id}_{locale}.md` (e.g., Tamil version: `1_ta.md`)

## Processing & Auditing Skills

### 1. Duplicate Question Removal

* **Scope:** Only evaluate files modified within the last 1 day (24 hours).
* **Identification:** Check for duplicate questions against the default English (`{id}.md`) question files among the recently modified files.
* **Action:** If a duplicate question is identified, remove **both** the English file (`{id}.md`) and all associated localized language files (e.g., `{id}_ta.md`).

### 2. Question Type Classification & Restructuring

Questions that contain combination choices in their answers (e.g., "Both Choice 1 & Choice 2" or "Choice A and Choice B") must be converted into standard multi-select questions. The combination choice must be removed, and its individual constituent choices must be placed directly into the `answers:` list.

#### Transformation Example:

**Before (Incorrect):**

```
---
choices:
  - "Choice 1"
  - "Choice 2"
  - "Choice 3"
answers:
  - "Both Choice 1 & Choice 2"

---

Write your question here?
Additional Markdown content can be added here.

---

Explanation of the correct answer.
```

**After (Correct):**

```
---
choices:
  - "Choice 3"
answers:
  - "Choice 1"
  - "Choice 2"

---

Write your question here?
Additional Markdown content can be added here.

---

Explanation of the correct answer.
```

### 3. Localization & Translation Alignment

* **Completeness:** Every question must exist in all supported target languages (e.g., English and Tamil).
* **Translation:** If a question is available in only one language, translate it into all missing target languages.
* **Context Preservation:** Maintain context and terminology by cross-referencing existing translated questions in the repository to determine accurate domain vocabulary.

### 4. Mandatory Explanations

* **Explanations Required:** Every question entry must include a clear, accurate, and contextually relevant explanation for the correct answer placed after the second `---` separator in its respective language file.

### 5. Answer Validation

* **Scope:** Target files modified within the last 1 day (24 hours).
* **Validation:** Verify and validate that the selected answers in the frontmatter (`answers:`) correctly correspond to the factual truth and answer keys for all recently modified files.