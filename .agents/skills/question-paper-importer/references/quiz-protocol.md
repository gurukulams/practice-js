# Practice-JS Quiz Protocol Reference

This document outlines the markdown and JSON protocol used by `practice-js`.

## 1. File Naming Rules
Files and directories must match the regex `/^[a-z0-9]+(-[a-z0-9]+)*(_[a-z]{2})?$/`:
- Lowercase alphanumeric characters and hyphens only
- Suffix `_<locale>` (e.g. `_ta`) indicates localized content
- Base language file must not have a locale suffix (e.g. `q01.md`)

## 2. Question Types

| Type | When Used | Required Frontmatter |
|---|---|---|
| `CHOOSE_THE_BEST` | Single-choice MCQ | `choices`, `answers` (1 element in answers) |
| `MULTI_CHOICE` | Multiple-choice MCQ | `choices`, `answers` (>1 element in answers) |
| `MATCH_THE_FOLLOWING` | Matching pairs | `choices`, `matches` |
| `DESCRIPTIVE` | Short, medium, and long answer questions | none (question body + explanation model answer) |

## 3. Math Equations
- Inline equations: `$E = mc^2$`
- Display / Block equations: `$$\sum_{i=1}^{n} x_i$$`

## 4. Frontmatter Fields
- `complexity`: `"M"` (Medium) or `"H"` (Hard)
- `tags`: List of string labels
- `choices`: List of incorrect options or distractors
- `answers`: List of correct answer strings
- `matches`: List of matching target items
