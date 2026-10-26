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
        repoUrl: '/questions',
        maxQ: 10,
        shuffle: true
    }
);

await maker.ready;
```

### HTML

```html
<div id="practice-container"></div>

<script type="module">
    import PracticeMaker from './src/practice.js';

    const maker = new PracticeMaker(
        document.getElementById('practice-container'),
        {
            mode: 'PRACTICE',
            repoUrl: '/questions',
            maxQ: 10
        }
    );
</script>
```

## Configuration Options

All configuration options are managed internally through `this._options`.

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | String | `PRACTICE` | Operating mode: `PRACTICE`, `QUIZ`, or `EDIT`. |
| `repoUrl` | String | `undefined` | URL of the question repository. |
| `questions` | Array | `undefined` | Questions supplied directly as an array. |
| `maxQ` | Number | `null` | Maximum number of questions to load. |
| `complexity` | String | `null` | Filter questions by complexity. |
| `timer` | Number | `null` | Quiz duration in seconds. |
| `locale` | String | `en` | Language used for interface labels. |
| `languageCode` | String | `locale` | Language used when loading questions. |
| `tags` | Array | `undefined` | Filter questions using tags. |
| `shuffleQuestions` | Boolean | `true` | Randomize question order. |
| `includeUserQuestions` | Boolean | Conditional | Include user-created questions. |
| `source` | String | `all` / `user` | Question source. Defaults to `user` in EDIT mode. |
| `error` | Function | `undefined` | Callback for reporting errors. |

**Aliases:** `maxQuestions` is accepted as an alternative to `maxQ`, and `shuffle` as an alternative to `shuffleQuestions`.

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
    maxQ: 15,
    timer: 600,
    complexity: 'MEDIUM'
});
```

`setOptions()` updates the configuration, resets the relevant UI state, and reloads questions.

### Update individual options

```javascript
maker.mode = 'PRACTICE';
maker.maxQ = 10;
maker.timer = 300;
maker.complexity = 'EASY';
maker.locale = 'ta';
```

Individual property setters delegate to `setOptions()`.

**Recommendation:** Use `await maker.setOptions({...})` when updating multiple options to avoid repeated question loading.

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

Questions can also be provided directly without a repository URL.

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
    complexity: 'HARD',
    tags: ['algebra', 'geometry'],
    maxQ: 10
});
```

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
- `languageCode` determines the language requested from the question loader.

## Error Handling

Register an error callback to handle question-loading and validation errors.

```javascript
const maker = new PracticeMaker(
    document.getElementById('practice-container'),
    {
        repoUrl: '/questions',
        error: (message) => {
            console.error(message);
        }
    }
);
```

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