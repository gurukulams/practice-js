I'm attaching a bilingual (Tamil and English) question paper as a PDF. Extract every question and give me two Markdown outputs: one in English and one in Tamil.

## Output format

Each output goes in its own fenced ```markdown code block, English first, then Tamil. Both use this structure:

```markdown
# Questions

## 1 Mark

Question text
- Option
- Option
- Option
- Option

Question text with a diagram
![Diagram](image-1.png)
- Option
- Option

Question text without options

## 2 Mark

Question text

## 3 Mark

...
```

- Keep the headings exactly as `# Questions` and `## <N> Mark`, in English for both languages.
- Group questions by the marks per question, which you can read from each part header (e.g. "15x1=15" means 1 mark, "6x2=12" means 2 marks, and so on).
- Keep the questions in the same order as the PDF.
- Put a blank line between questions.
- Write multiple-choice options as `- ` bullets directly under the question.

## Rules

1. **Keep the content verbatim from the PDF.**
   - Do not translate, rephrase, correct spelling, fix grammar or change punctuation.
   - Keep the original spacing, such as the space before `?` and `:` in the Tamil text.
   - Keep curly quotes, blanks (`__________`) and symbols exactly as printed.
   - If the source looks like a typo, keep it as is.
2. **Remove labels only.**
   - Question numbers (1., 24.).
   - Option letters ((a), (அ), etc.).
   - Sub-part labels ((i), (ii), (a), (b)).
3. **Remove instructions and separators.**
   - Part headers, "Answer any six", "Question No. X is compulsory", page numbers, "Turn over" and register-number boxes.
   - "OR" and "அல்லது".
4. **Either/or questions:** split them into separate questions so that every question is kept.
5. **Multi-part questions** (e.g. (i), (ii), (iii) under one question): merge them into one question, joined in order as a single paragraph with no labels.
6. **Options that refer to other options** (e.g. "Both (b) and (c)"): keep them verbatim, and list them under "Notes" after the outputs.
7. **Images** (diagrams, figures, tables shown as pictures, or options that are pictures):
   - Do not describe or redraw them. Replace each one with a Markdown image placeholder at the exact position where it appears: `![Diagram](image-N.png)`.
   - Number the placeholders sequentially across the whole paper (`image-1.png`, `image-2.png`, ...) in the order they appear. Use lowercase letters, digits and hyphens only.
   - If an option is an image, write it as `- ![Option](image-N.png)`.
   - Use the same placeholder names in the English and Tamil outputs for the same image.
   - Keep any caption or label text that is printed with the image as normal text.
   - If a question only asks the student to draw something and no image is printed, do not add a placeholder.
8. **Tamil and English must align:** both outputs must contain the same number of questions in the same order, so they can be matched by index.
9. Do not skip any question. If a character is unclear, keep your best reading and list it under "Notes". Do not silently guess.

## After the two code blocks, add a short "Notes" section with:
- Question count per mark section, for English and Tamil.
- The list of image placeholders, with the question each belongs to.
- Any option text that references other options.
- Any characters or words you were unsure about.