# Tags & tag-based filtering

Tags let a question be labeled (e.g. `OOP`, `Interfaces`) and let a user
narrow the current question set down to questions carrying all of the tags
they've selected. There is no separate `Tag` component/library — everything
described here lives in this package, mostly in `src/practice.js`.

## 1. Authoring

Tags are written as YAML front-matter on question markdown files under
`questions/**/*.md`:

```yaml
---
complexity: "M"
tags:
  - "OOP"
  - "Java Basics"
---
```

## 2. Build pipeline

`scripts/build-questions.js` validates the `tags` field against a JSON
Schema (`type: "array"`, string items, `uniqueItems: true` — see line ~35),
then copies it onto the compiled question object:

```js
// scripts/build-questions.js:133-135
if (Array.isArray(data.tags)) {
  question.tags = data.tags.map(tag => tag.trim());
}
```

The same script also normalizes/dedupes tags when generating the flattened
question index (`scripts/build-questions.js:253-265`), producing entries like:

```json
{ "question": "...", "tags": ["OOP", "Interfaces"], "type": "CHOOSE_THE_BEST", "id": "...", "choices": [...] }
```

in the compiled `dist/data/questions.json`.

## 3. Runtime data flow

`src/q-loader.js`'s `QuestionLoader.loadQuestions()` fetches the compiled
`questions.json` (and any subfolder `questions.json` files) over HTTP and
returns the array of question objects, tags included, unmodified. The caller
passes that array into `PracticeMaker.setQuestions()`.

## 4. Selection state — driven entirely by the URL

There is no in-memory reactive state (no store, no props). Selected tags are
read once, in the `PracticeMaker` constructor, from the `?tags=` query
param:

```js
// src/practice.js:176-179
this.urlParams = new URLSearchParams(window.location.search);
const selectedTagsParam = this.urlParams.get("tags");
this.selectedTags = selectedTagsParam ? selectedTagsParam.split(",") : [];
```

Every tag click updates `this.urlParams` and does a **full page reload**
(`window.location.search = this.urlParams.toString()`), which re-runs the
constructor and re-parses `?tags=` from scratch. See §6.

## 5. Filtering

`setQuestions()` defines and applies `filterQuestions` (`src/practice.js:202-234`):

```js
function filterQuestions(questions, targetComplexity, selectedTags = []) {
  return questions.filter(q => {
    // ...complexity filter first...
    if (!selectedTags || selectedTags.length === 0) return true;
    const questionTags = q.tags || [];
    // AND logic: the question must contain ALL selected tags
    return selectedTags.every(tag => questionTags.includes(tag));
  });
}
this.questions = this.shuffle(filterQuestions(_questions, this.complexity, this.selectedTags));
```

Filtering is AND-based and applied once per `setQuestions()` call (i.e. once
per page load, since selection changes trigger a reload).

## 6. Rendering & click behavior

`setQuestion()` rebuilds `#headerTagsContainer` from scratch on every
question change (`src/practice.js:326-388`):

- If the question has tags, it inserts a `bi-tags` icon, then one
  `<span class="badge">` per tag.
- **Selected** tags (already in `this.selectedTags`) render as
  `badge bg-primary text-white ...` with an appended "×" that removes the
  tag from `this.urlParams` and reloads.
- **Unselected** tags render as `badge border text-body me-1` with
  `cursor: pointer`; clicking adds the tag to `this.urlParams` and reloads.

No custom CSS exists for this — everything is Bootstrap 5 badge/utility
classes plus Bootstrap Icons, both loaded from CDN in `public/index.html`.

## Known limitations

- **No callback/prop API.** `PracticeMaker` doesn't expose an `onTagClick`
  or `selectedTags` option — tag state is read directly from
  `window.location.search`. A consumer embedding `PracticeMaker` can't hook
  into tag selection without relying on the URL and a page reload.
- **State resets on every load**, by design — there's no persistence beyond
  the URL, so bookmarking/sharing a `?tags=` link is the only way state
  survives a reload.
