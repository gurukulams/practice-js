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

## 4. Selection state — driven by the URL, updated in place

There is no separate store/props — `this.selectedTags` is the single source
of truth, and the `?tags=` query param mirrors it. Selected tags are read
once, in the `PracticeMaker` constructor, from the URL:

```js
// src/practice.js:176-179
this.urlParams = new URLSearchParams(window.location.search);
const selectedTagsParam = this.urlParams.get("tags");
this.selectedTags = selectedTagsParam ? selectedTagsParam.split(",") : [];
```

Every tag click updates `this.selectedTags`/`this.urlParams` and calls
`_applyTagSelection()`, which pushes the new `?tags=` value onto the URL via
`history.pushState` (no navigation) and re-runs `setQuestions()` against the
already-loaded, unfiltered question set (`this.originalQuestions`). See §6.
A `popstate` listener registered in the constructor keeps `selectedTags` in
sync with browser Back/Forward, since those no longer trigger a reload
either.

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

Filtering is AND-based and re-applied every time `setQuestions()` runs —
once on initial page load, and again in place every time the tag selection
changes (no reload required).

## 6. Rendering & click behavior

`setQuestion()` rebuilds `#headerTagsContainer` from scratch on every
question change (`src/practice.js:326-388`):

- If the question has tags, it inserts a `bi-tags` icon, then one
  `<span class="badge">` per tag.
- **Selected** tags (already in `this.selectedTags`) render as
  `badge bg-primary text-white ...` with an appended "×" that removes the
  tag and calls `_applyTagSelection()`.
- **Unselected** tags render as `badge border text-body me-1` with
  `cursor: pointer`; clicking adds the tag and calls `_applyTagSelection()`.

`_applyTagSelection(updatedTags)` (`src/practice.js`) is the shared path for
both: it sets `this.selectedTags`, pushes the updated `?tags=` value onto
the URL with `history.pushState` (no navigation, so any surrounding page
state — e.g. an open overlay/modal in a host app — is left untouched), and
re-renders by calling `this.setQuestions(this.originalQuestions)`.

No custom CSS exists for this — everything is Bootstrap 5 badge/utility
classes plus Bootstrap Icons, both loaded from CDN in `public/index.html`.

## Known limitations

- **No callback/prop API.** `PracticeMaker` doesn't expose an `onTagClick`
  or `selectedTags` option — tag state is read/written directly via
  `this.selectedTags` and the URL. A consumer embedding `PracticeMaker`
  can't hook into tag selection changes without polling the URL.
- **No cross-session persistence**, by design — state lives only in the URL,
  so bookmarking/sharing a `?tags=` link is the only way selection survives
  a genuine page reload (opening the link fresh, not clicking a tag).
