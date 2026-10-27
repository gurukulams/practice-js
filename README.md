# PracticeMaker

A lightweight, configurable JavaScript library for building interactive question-based learning experiences.

PracticeMaker supports **Practice, Quiz, and Edit modes**, with question loading, filtering, navigation, answer verification, timers, and question authoring.

## Features

- **Practice Mode** — Answer questions and verify responses instantly.
- **Quiz Mode** — Take timed assessments and review results.
- **Edit Mode** — Create and manage questions.
- **Question Loading** — Load questions from repositories or JavaScript arrays.
- **Filtering** — Filter questions by complexity and tags.
- **Randomization** — Shuffle questions and answer choices.
- **Localization** — Support multiple languages.
- **Configurable UI** — Dynamically update settings without recreating the component.

## Setup

### Install dependencies

```bash
npm i
```

### Development

Start the development server in watch mode:

```bash
npm run watch
```

## Usage

### Basic Example

```javascript
import PracticeMaker from './src/practice.js';

const maker = new PracticeMaker(
    document.getElementById('practice-container'),
    {
        mode: 'PRACTICE',
        baseUrl: 'https://www.example.com',
        repoUrl: 'maths/algebra',
        maxQ: 10,
        shuffle: true
    }
);

await maker.ready;
```

Questions are fetched from `baseUrl + '/data/' + repoUrl`. In the example above, that is `https://www.example.com/data/maths/algebra`.

### HTML

```html
<div id="practice-container"></div>

<script type="module">
    import PracticeMaker from './src/practice.js';

    const maker = new PracticeMaker(
        document.getElementById('practice-container'),
        {
            mode: 'PRACTICE',
            baseUrl: 'https://www.example.com',
            repoUrl: 'maths/algebra',
            maxQ: 10
        }
    );
</script>
```

If the questions are served from the same origin as your page, omit `baseUrl`:

```javascript
const maker = new PracticeMaker(container, {
    repoUrl: 'maths/algebra'   // fetched from /data/maths/algebra
});
```

## Question Repository

`baseUrl` and `repoUrl` together point to a folder inside the `data` directory of your site.

| Part | Example | Description |
|---|---|---|
| `baseUrl` | `https://www.example.com` | Site origin. Defaults to `''` (same origin, resolved as `/data/...`). A trailing slash is ignored. |
| `/data/` | `/data/` | Fixed data root. Added automatically. |
| `repoUrl` | `maths/algebra` | Path of the question folder relative to the data root. Leading and trailing slashes are ignored. |

### Expected folder layout

```
data/
├── q-map.json
└── maths/
    ├── questions.json            (optional; questions of "maths" itself)
    └── algebra/
        ├── questions.json
        ├── questions_ta.json     (optional; localized questions)
        └── linear-equations/
            └── questions.json
```

- `data/q-map.json` describes the folder tree, for example `{ "maths": { "algebra": { "linear-equations": {} } } }`.
- Loading `maths/algebra` also loads every folder beneath it (here, `linear-equations`).
- A folder without a `questions.json` is skipped.
- If `repoUrl` is not found in `q-map.json`, no questions are loaded.
- If `data/q-map.json` itself cannot be found, loading fails and the `error` callback is called.

### Localized questions

When `languageCode` is set (and is not `en`), `questions_<languageCode>.json` is loaded from the same folder. A numeric entry in the localized file refers to the question at that index in `questions.json`, so only translated questions need to be repeated in full.

## Configuration Options

All configuration options are managed internally through `this._options`.

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | String | `PRACTICE` | Operating mode: `PRACTICE`, `QUIZ`, or `EDIT`. |
| `baseUrl` | String | `''` | Site origin that hosts the `data` folder, for example `https://www.example.com`. |
| `repoUrl` | String | `undefined` | Question folder path relative to `<baseUrl>/data/`, for example `maths/algebra`. |
| `questions` | Array | `undefined` | Questions supplied directly as an array. When set, nothing is fetched from `baseUrl` / `repoUrl`. |
| `maxQ` | Number | `null` | Maximum number of questions to load. |
| `complexity` | String | `null` | Filter questions by complexity. See [Filtering Questions](#filtering-questions). |
| `timer` | Number | `null` | Quiz duration in seconds. |
| `locale` | String | `en` | Language used for interface labels. |
| `languageCode` | String | `locale` | Language used when loading questions. |
| `tags` | Array | `undefined` | Filter questions using tags. |
| `shuffleQuestions` | Boolean | `true` | Randomize question order. |
| `includeUserQuestions` | Boolean | Conditional | Include user-created questions. |
| `source` | String | `all` / `user` | Question source. Defaults to `user` in EDIT mode. |
| `error` | Function | `undefined` | Callback for reporting errors. |

**Aliases:** `maxQuestions` is accepted as an alternative to `maxQ`, and `shuffle` as an alternative to `shuffleQuestions`.

**Migrating from an older version:** `repoUrl` used to be a full path such as `/data/maths/algebra`. It is now relative to `<baseUrl>/data/`, so use `maths/algebra` instead.

## Operating Modes

### Practice Mode

Allows learners to answer questions and verify answers immediately.

```javascript
await maker.setOptions({
    mode: 'PRACTICE',
    maxQ: 20,
    shuffleQuestions: true
});
```

### Quiz Mode

Enables timed assessments, answer tracking, and result summaries.

```javascript
await maker.setOptions({
    mode: 'QUIZ',
    maxQ: 25,
    timer: 900
});
```

The timer is specified in seconds. In this example, the quiz duration is 15 minutes.

### Edit Mode

Allows users to create and edit questions.

```javascript
await maker.setOptions({
    mode: 'EDIT',
    includeUserQuestions: true,
    source: 'user'
});
```

## Dynamic Configuration

PracticeMaker supports updating configuration at runtime through `setOptions()`.

### Update multiple options

```javascript
await maker.setOptions({
    mode: 'QUIZ',
    repoUrl: 'maths/geometry',
    maxQ: 15,
    timer: 600,
    complexity: 'M'
});
```

`setOptions()` updates the configuration, resets the relevant UI state, and reloads questions.

### Switch to a different question set

```javascript
await maker.setOptions({
    baseUrl: 'https://www.example.com',
    repoUrl: 'science/physics'
});
```

### Update individual options

```javascript
maker.mode = 'PRACTICE';
maker.baseUrl = 'https://www.example.com';
maker.repoUrl = 'maths/algebra';
maker.maxQ = 10;
maker.timer = 300;
maker.complexity = 'M';
maker.locale = 'ta';
```

Individual property setters delegate to `setOptions()`, and each one reloads questions.

**Recommendation:** Use `await maker.setOptions({...})` when updating multiple options (for example `baseUrl` and `repoUrl` together) to avoid repeated question loading.

## Public API

| Method / Property | Description |
|---|---|
| `maker.ready` | Promise representing initial question loading. |
| `maker.options` | Returns a copy of the current configuration. |
| `maker.setOptions(options)` | Updates configuration and reloads questions. |
| `maker.setQuestions(questions)` | Supplies questions programmatically. |
| `maker.loadQuestions()` | Reloads questions from the configured loader. |
| `maker.setQuestion(index)` | Displays a question by index. |
| `maker.doNext()` | Navigates to the next question. |
| `maker.doPrevious()` | Navigates to the previous question. |
| `maker.doCheck()` | Verifies the current answer. |
| `maker.doSubmit()` | Submits the quiz and displays results. |
| `maker.setEditable(boolean)` | Enables or disables question editing in the question pane. |
| `maker.destroy()` | Stops the timer and removes registered cleanup handlers. |

## Loading Questions Programmatically

Questions can also be provided directly without `baseUrl` / `repoUrl`.

```javascript
const maker = new PracticeMaker(
    document.getElementById('practice-container'),
    {
        mode: 'PRACTICE',
        questions: [],
        shuffleQuestions: false
    }
);

await maker.ready;

await maker.setQuestions(myQuestions);
```

## Filtering Questions

Filter questions by complexity, tags, and maximum question count.

```javascript
await maker.setOptions({
    complexity: 'M',
    tags: ['algebra', 'geometry'],
    maxQ: 10
});
```

`complexity` values:

| Value | Questions included |
|---|---|
| `null` (default) | Only questions that have no `complexity` set. |
| `M` | Questions with no `complexity`, plus those marked `M`. |
| `H` | All questions, regardless of complexity. |

A question must contain **all** of the listed `tags` to be included.

Question filtering and shuffling are delegated to `QuestionLoader`.

## Localization

Configure the UI and question language independently.

```javascript
await maker.setOptions({
    locale: 'ta',
    languageCode: 'ta'
});
```

- `locale` controls translated UI labels.
- `languageCode` determines the language requested from the question loader (`questions_ta.json` in this example).

## Error Handling

Register an error callback to handle question-loading and validation errors.

```javascript
const maker = new PracticeMaker(
    document.getElementById('practice-container'),
    {
        baseUrl: 'https://www.example.com',
        repoUrl: 'maths/algebra',
        error: (message) => {
            console.error(message);
        }
    }
);
```

Errors are reported for failed requests (non-404 HTTP errors) and when `data/q-map.json` is missing. A `repoUrl` that is not present in `q-map.json` is not an error; it simply returns no questions.

## Cleanup

Call `destroy()` when removing the component.

```javascript
maker.destroy();
```

This stops the quiz timer and removes registered keyboard and navigation listeners.

## License

**BSD License**

PracticeMaker is distributed under the BSD license.

See the `LICENSE` file for the complete license terms.