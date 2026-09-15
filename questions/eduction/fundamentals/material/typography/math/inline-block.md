---
choices:
  - Using screenshots of equations
answers:
  - Using $...$ for inline math
  - Using <div class="math-display"> for block math
  - Using LaTeX syntax
---

## How should a content creator implement Math Expressions in their learning materials?

```markdown
Our system leverages **KaTeX** for high-performance rendering. 

* **Inline:** Use single dollar signs like $\sum_{i=1}^{n} i$.
* **Display:** Use the `math-display` div for centered formulas.
* **Syntax:** Always write in standard LaTeX format to ensure the parser recognizes the symbols. 

*Note: Screenshots are discouraged as they are not accessible or searchable.*
```