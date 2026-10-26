
import QuestionPane from "./components/QuestionPane";
import AuthorPane from "./components/AuthorPane";
import { t } from "./i18n";
import QuestionLoader from "./components/QuestionLoader";
import {
  loadUserQuestions,
  saveUserQuestion,
  deleteUserQuestion,
} from "./storage";

export { loadUserQuestions, saveUserQuestion, deleteUserQuestion };

export default class PracticeMaker {
  constructor(_contentRoot, _options) {
    this._options = this._normalizeOptions(_options);
    this.questionLoader = new QuestionLoader(this._loaderOptions());

    const L = (key) => t(this._options.locale, key);

    _contentRoot.innerHTML = `
    <div id="content" class="d-none" data-type="question">
    <header
       class="navbar navbar-expand-lg navbar-light border-bottom bg-body py-2 shadow-sm"
    >
       <div class="d-flex align-items-center w-100">

          <!-- Left-side Tags Container: populated per-question in setQuestion() -->
          <div id="headerTagsContainer" class="d-flex align-items-center gap-1 flex-wrap me-auto"></div>

          <ul
             class="navbar-nav ms-auto d-flex flex-row justify-content-evenly justify-content-lg-end mt-lg-0 pb-lg-0"
          >

          <li class="nav-item">
          <div
          id="quizTimer"
          class="d-none fw-bold fs-5 align-self-center me-3"
       ></div>
          </li>

          <li class="nav-item">
          <span id="editModeBadge" class="btn badge bg-warning text-dark d-none"
             >${L('editModeBadge')}</span
          >
          </li>

          <li class="nav-item">
          <button
             type="button"
             class="btn d-none px-2 mx-2 text-white border-dark-subtle"
             data-bs-toggle="tooltip"
             data-bs-placement="bottom"
             title="Explain"
             id="explainToggleBtn"
          >
             <span></span>
             <i class="bi bi-question"></i>
          </button>
          </li>

             <li
                class="nav-item d-none d-flex align-items-center position-relative px-1"
                id="editControls"
                style="padding-bottom: 6px"
             >

             <button
                type="button"
                class="btn btn-sm btn-outline-primary border-0"
                id="editAddNavBtn"
             >
                <i class="bi bi-plus fs-5"></i>
             </button>

             </li>
             <li class="nav-item">
                  <small id="questionCounter" class="btn btn-sm">
                      Q 12 / 50
                  </small>
              </li>
             <li class="nav-item">
                <button
                id="prevBtn"
                   class="btn btn-outline-secondary btn-sm border-0"
                   disabled=""
                   title="No previous page"
                >
                   <i class="bi bi-arrow-left fs-5"></i>
                </button>
             </li>
             <li class="nav-item">
             <button
                id="nextBtn"
                   class="btn btn-outline-secondary btn-sm border-0"
                   disabled=""
                   title="No Next page"
                >
                   <i class="bi bi-arrow-right fs-5"></i>
                </button>
             </li>
          </ul>
       </div>
    </header>
    <div id="navPane" class="d-flex align-items-center mt-2">
    </div>
    <div id="questionPane" class="row h-50">
       <div class="col-12 col-md-6">
          <span id="questionContainer" class="lead"></span>
          <div class="form-floating mb-3 h-100" id="matcheContainer"></div>
       </div>
       <div class="col-12 col-md-6">
          <span id="explanationContainer" class="d-none"></span>
          <div class="form-floating mb-3 h-100" id="answerContainer"></div>
       </div>
    </div>
 </div>
 <div id="notfound" class="row d-none">
    <div class="d-flex align-items-center justify-content-center">
       <div class="text-center">
          <p class="fs-3">${L('noQuestions')}</p>
          <a href="/" class="btn btn-primary">${L('goBack')}</a>
       </div>
    </div>
 </div>
 <div id="editEmptyState" class="d-none">
    <div
       class="d-flex align-items-center justify-content-center"
       style="min-height: 300px"
    >
       <div class="text-center text-muted">
          <i class="bi bi-journal-plus fs-1 mb-3 d-block"></i>
          <p class="fs-5 mb-3">No questions yet</p>
          <button type="button" class="btn btn-primary" id="editEmptyAddBtn">
             <i class="bi bi-plus me-1"></i>Add Question
          </button>
       </div>
    </div>
 </div>
 <div id="authorContainer" class="d-none"></div>

 <div
    id="fabPane"
    class="position-fixed bottom-0 end-0 d-flex align-items-center gap-2 me-3 mb-4 z-3"
 >

    <button
       type="button"
       class="btn btn-primary"
       id="checkBtn"
       title="Check Question"
    >
       <i class="bi bi-check"></i> ${L('verifyBtn')}
    </button>
    <button id="quizSubmitBtn" type="button" class="btn btn-danger d-none">
       ${L('submitQuiz')}
    </button>

 </div>
            `;

    this.questionPane = new QuestionPane((arr) => this.shuffle(arr));
    this.questionPane.readOnly = true;

    this.addActions();

    // Arrow key navigation
    this._keyHandler = (e) => {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' && !this.nextBtn.disabled) this.doNext();
      if (e.key === 'ArrowLeft' && !this.prevBtn.disabled) this.doPrevious();
    };
    document.addEventListener('keydown', this._keyHandler);

    // Get selected tags from URL parameters
    const hashString = window.location.hash.replace(/^#/, "");
    this.urlParams = new URLSearchParams(hashString);

    const selectedTagsParam = this.urlParams.get("tags");
    this.selectedTags = selectedTagsParam ? selectedTagsParam.split(",") : [];

    window.addEventListener("hashchange", () => {
      const hashString = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hashString);
      const selectedTagsParam = params.get("tags");

      this.selectedTags = selectedTagsParam ? selectedTagsParam.split(",") : [];
      this.loadQuestions();
    });

    // Keep tag selection in sync with browser Back/Forward
    this._popstateHandler = () => {
      this.urlParams = new URLSearchParams(window.location.search);
      const tagsParam = this.urlParams.get("tags");
      this.selectedTags = tagsParam ? tagsParam.split(",") : [];
      if (this.originalQuestions) this.loadQuestions();
    };
    window.addEventListener('popstate', this._popstateHandler);

    this._resetUI();
    this.ready =
      this._options.repoUrl ||
      Array.isArray(this._options.questions) ||
      this._options.includeUserQuestions
      ? this.loadQuestions()
      : Promise.resolve(this);
  }

  _normalizeOptions(options = {}) {
    const merged = { ...this._options, ...options };
    const mode = merged.mode ?? 'PRACTICE';
    const repoUrl = merged.repoUrl;
    const modeChanged = Object.hasOwn(options, 'mode');

    return {
      ...merged,
      mode,
      locale: merged.locale ?? 'en',
      complexity: merged.complexity ?? null,
      maxQ: options.maxQ ?? options.maxQuestions ??
            merged.maxQ ?? merged.maxQuestions ?? null,
      timer: merged.timer ?? null,
      shuffleQuestions: merged.shuffleQuestions ?? merged.shuffle ?? true,
      includeUserQuestions: options.includeUserQuestions ??
        (modeChanged
          ? Boolean(repoUrl || mode === 'EDIT')
          : merged.includeUserQuestions ?? Boolean(repoUrl || mode === 'EDIT')),
      source: options.source ??
        (modeChanged
          ? (mode === 'EDIT' ? 'user' : 'all')
          : merged.source ?? (mode === 'EDIT' ? 'user' : 'all')),
    };
  }

  _loaderOptions() {
    const o = this._options;
    return {
      repoUrl: o.repoUrl,
      languageCode: o.languageCode ?? o.locale,
      questions: o.questions,
      includeUserQuestions: o.includeUserQuestions,
      source: o.source,
      complexity: o.complexity,
      maxQuestions: o.maxQ,
      tags: o.tags,
      shuffle: o.shuffleQuestions,
    };
  }

  get options() { return { ...this._options }; }

  get mode() { return this._options.mode; }
  set mode(value) { void this.setOptions({ mode: value }); }

  get maxQ() { return this._options.maxQ; }
  set maxQ(value) { void this.setOptions({ maxQ: value }); }

  get timer() { return this._options.timer; }
  set timer(value) { void this.setOptions({ timer: value }); }

  get complexity() { return this._options.complexity; }
  set complexity(value) { void this.setOptions({ complexity: value }); }

  get locale() { return this._options.locale; }
  set locale(value) { void this.setOptions({ locale: value }); }

  get repoUrl() { return this._options.repoUrl; }
  set repoUrl(value) { void this.setOptions({ repoUrl: value }); }

  async setOptions(changes = {}) {
    this._options = this._normalizeOptions(changes);
    this._stopTimer();
    this.questionLoader = new QuestionLoader(this._loaderOptions());
    this._resetUI();
    return this.loadQuestions();
  }

  _resetUI() {
    const mode = this._options.mode;
    const toggle = (id, visible) =>
      document.getElementById(id)?.classList.toggle('d-none', !visible);

    toggle('checkBtn', mode === 'PRACTICE');
    toggle('editControls', mode === 'EDIT');
    toggle('quizTimer', false);
    toggle('quizSubmitBtn', false);
    toggle('nextBtn', true);
    toggle('explainToggleBtn', false);

    document.getElementById('quizResults')?.remove();
    document.getElementById('backToResultsBtn')?.remove();
    document.getElementById('editControls')?.classList.toggle(
      'd-flex', mode === 'EDIT'
    );

    this.questionPane.readOnly = true;
  }

  _stopTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  _startTimer() {
    this._stopTimer();

    if (this._options.mode !== 'QUIZ' || !this._options.timer) return;

    this.timeRemaining = this._options.timer;
    document.getElementById('quizTimer').classList.remove('d-none');
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      this.updateTimerDisplay();

      if (this.timeRemaining <= 0) {
        this._stopTimer();
        this.doSubmit();
      }
    }, 1000);
  }

  async loadQuestions() {
    try {
      const questions = await this.questionLoader.loadQuestions({
        tags: this.selectedTags,
      });

      this.originalQuestions = this.questionLoader.originalQuestions;
      this._renderQuestions(questions);
      return this;

    } catch (error) {
      this._options.error?.(`Failed to load questions: ${error.message}`);
      throw error;
    }
  }

  shuffle(array) {
    if (!Array.isArray(array) || !this._options.shuffleQuestions) {
      return array;
    }

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  _applyTagSelection(tags) {
    this.selectedTags = tags;

    const params = new URLSearchParams();
    if (tags.length) params.set('tags', tags.join(','));

    const hash = params.toString();

    if (hash) {
      history.pushState(null, '', `#${hash}`);
    } else {
      history.replaceState(
        null, '',
        window.location.pathname + window.location.search
      );
    }

    return this.loadQuestions();
  }

  setQuestions(questions) {
    this.questionLoader.setQuestions(questions);
    return this.loadQuestions();
  }

  _renderQuestions(questions) {
    this._stopTimer();

    this.questions = questions;
    this.currentQuestionIndex = 0;
    this.userAnswers = {};
    this.results = [];

    const mode = this._options.mode;
    const hasQuestions = questions.length > 0;

    const toggle = (id, visible) =>
      document.getElementById(id)?.classList.toggle('d-none', !visible);

    toggle('content', hasQuestions);
    toggle('notfound', !hasQuestions && mode !== 'EDIT');
    toggle('editEmptyState', !hasQuestions && mode === 'EDIT');

    if (!hasQuestions) {
      if (mode !== 'EDIT') {
        const link = document.querySelector('#notfound a.btn-primary');
        if (link) {
          link.href = document.referrer || '/';
          link.textContent = 'Go Back';
        }
      }
      return;
    }

    let startIndex = 0;

    if (mode === 'EDIT') {
      const id = window.location.hash.replace(/^#/, '');
      const index = questions.findIndex(q => q.id === id);
      if (index >= 0) startIndex = index;
    }

    this.setQuestion(startIndex);
    this._startTimer();
  }

  setQuestion(index) {
    if (index < 0 || index >= this.questions.length) return;

    this._saveCurrentAnswer();

    const mode = this._options.mode;
    const isFirst = index === 0;
    const isLast = index === this.questions.length - 1;

    this.currentQuestionIndex = index;

    this.prevBtn.disabled = isFirst;
    this.nextBtn.disabled = isLast;

    this.nextBtn.classList.toggle('d-none', mode === 'QUIZ' && isLast);

    document.getElementById('quizSubmitBtn')
      .classList.toggle('d-none', mode !== 'QUIZ' || !isLast);

    document.getElementById('questionCounter').textContent =
      `Q ${index + 1} / ${this.questions.length}`;

    this.explainToggleBtn.classList.add('d-none');
    this.doExplain(false);

    const question = this.questions[index];

    this._renderTags(question.tags || []);
    this.questionPane.setQuestion(question);

    if (mode === 'QUIZ') {
      const saved = this.userAnswers[question.id];
      if (saved !== undefined) this._restoreAnswer(question, saved);
    }

    if (mode === 'EDIT') this._updateEditBtn();
  }

  _saveCurrentAnswer() {
    const question = this.questionPane.getQuestion?.();
    if (!question) return;

    this.userAnswers ??= {};
    this.userAnswers[question.id] = this.questionPane.getAnswer();
  }

  _renderTags(tags) {
    const container = document.getElementById('headerTagsContainer');
    container.replaceChildren();

    if (!tags.length) return;

    const icon = document.createElement('i');
    icon.className = 'bi bi-tags me-2';
    container.appendChild(icon);

    tags.forEach(tag => {
      const selected = this.selectedTags.includes(tag);
      const badge = document.createElement('span');

      badge.className = selected
        ? 'badge bg-primary text-white me-1'
        : 'badge border text-body me-1';

      badge.style.cursor = 'pointer';
      badge.textContent = tag;

      if (selected) {
        const close = document.createElement('span');
        close.className = 'ms-1';
        close.textContent = ' ×';
        badge.appendChild(close);
      }

      badge.addEventListener('click', () => {
        const updated = selected
          ? this.selectedTags.filter(t => t !== tag)
          : [...this.selectedTags, tag];

        this._applyTagSelection(updated);
      });

      container.appendChild(badge);
    });
  }

  doNext() {
    this.setQuestion(this.currentQuestionIndex + 1);
    this.setQuestionParameter();
  }

  doPrevious() {
    this.setQuestion(this.currentQuestionIndex - 1);
    this.setQuestionParameter();
  }

  setQuestionParameter() {
    // Reserved for URL-based question navigation.
  }

  doExplain(explain) {
    this.explainToggleBtn.classList.toggle('btn-primary', explain);
    this.explainToggleBtn.classList.toggle('btn-outline-primary', !explain);
    this.questionPane.doExplain(explain);
  }

  doSubmit() {
    this._saveCurrentAnswer();
    this._stopTimer();

    this.results = this.questions.map(question => {
      const answer = this.userAnswers[question.id] || '';

      return {
        correct: this._checkAnswer(question, answer),
        answered: answer !== '',
      };
    });

    if (this._options.mode === 'QUIZ') {
      this.showResultGrid();
    }
  }

  _checkAnswer(question, answerText) {
    if (answerText === '' || answerText == null) return false;

    switch (question.type) {
      case 'CHOOSE_THE_BEST':
        return question.choices.some(
          choice => choice.answer === true && choice.id === answerText
        );

      case 'MULTI_CHOICE': {
        const correct = question.choices
          .filter(choice => choice.answer === true)
          .map(choice => choice.id)
          .sort();

        const selected = answerText
          .split(',')
          .map(id => id.trim())
          .sort();

        return selected.length === correct.length &&
          selected.every((id, i) => id === correct[i]);
      }

      case 'MATCH_THE_FOLLOWING': {
        const original = this.originalQuestions?.find(
          q => q.id === question.id
        );

        if (!original) return false;

        const count = original.choices.length;
        const ids = answerText.split(',');
        const choices = ids.slice(0, count);
        const matches = ids.slice(count, count * 2);

        if (choices.length !== count || matches.length !== count) {
          return false;
        }

        const pairs = Object.fromEntries(
          original.choices.map((choice, i) => [
            choice.id,
            original.matches[i].id,
          ])
        );

        return choices.every(
          (choiceId, i) => pairs[choiceId] === matches[i]
        );
      }

      case 'TEXT_ANSWER':
        return answerText.toLowerCase() ===
          question.answer.toLowerCase();

      case 'NUMBER_ANSWER': {
        const value = parseFloat(answerText);
        return !Number.isNaN(value) &&
          Math.abs(value - question.answer) < 0.0001;
      }

      default:
        return false;
    }
  }

  doCheck(silentMode = false) {
    const question = this.questionPane.getQuestion();
    const answer = this.questionPane.getAnswer();

    if (!answer && !silentMode) {
      this._options.error?.(
        t(this._options.locale, 'pleaseAnswer')
      );
      return false;
    }

    if (question.type === 'MULTI_CHOICE') {
      this._highlightMultiChoice(question);
    }

    const correct = this._checkAnswer(question, answer);

    this.questionPane.verify(correct);
    this._showCheckResult(correct);

    return correct;
  }

  _highlightMultiChoice(question) {
    const correctIds = new Set(
      question.choices
        .filter(choice => choice.answer === true)
        .map(choice => choice.id)
    );

    const items = this.questionPane.mcqList.element
      .querySelectorAll('li');

    items.forEach(item => {
      const input = item.querySelector('input');
      if (!input) return;

      item.classList.remove(
        'bg-success', 'bg-danger', 'text-white', 'text-black'
      );

      if (!input.checked) {
        item.classList.add('text-black');
        return;
      }

      item.classList.add(
        correctIds.has(input.value) ? 'bg-success' : 'bg-danger',
        'text-white'
      );
    });
  }

  _showCheckResult(correct) {
    const button = this.explainToggleBtn;
    if (!button) return;

    button.firstElementChild.textContent = t(
      this._options.locale,
      correct ? 'correctAnswer' : 'wrongAnswer'
    );

    button.classList.remove('btn-success', 'btn-danger', 'd-none');
    button.classList.add(correct ? 'btn-success' : 'btn-danger');
  }

  addActions() {
    this.explainToggleBtn = document.getElementById('explainToggleBtn');
    this.checkBtn = document.getElementById('checkBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');

    this.explainToggleBtn.addEventListener('click', () =>
      this.doExplain(
        !this.explainToggleBtn.classList.contains('btn-primary')
      )
    );

    this.checkBtn.addEventListener('click', () => this.doCheck());
    this.prevBtn.addEventListener('click', () => this.doPrevious());
    this.nextBtn.addEventListener('click', () => this.doNext());

    document.getElementById('quizSubmitBtn')
      .addEventListener('click', () => this.doSubmit());

    document.getElementById('editAddNavBtn')
      .addEventListener('click', () => this.showAuthorPane(null));

    document.getElementById('editEmptyAddBtn')
      .addEventListener('click', () => this.showAuthorPane(null));

    document.getElementById('questionPane')
      .addEventListener('dblclick', () => {
        if (this._options.mode !== 'EDIT') return;

        const question = this.questions?.[this.currentQuestionIndex];

        if (question?._source === 'user') {
          this.showAuthorPane(question);
        }
      });
  }

  _updateEditBtn() {
    const index = this.currentQuestionIndex;
    const total = this.questions.length;

    document.getElementById('questionCounter').textContent =
      `Q ${index + 1} / ${total}`;

    this.prevBtn.disabled = index === 0;
    this.nextBtn.disabled = index === total - 1;
  }

  showAuthorPane(question = null) {
    const container = document.getElementById('authorContainer');
    const fabPane = document.getElementById('fabPane');

    this._showElement('content', false);
    this._showElement('editEmptyState', false);
    container.classList.remove('d-none');

    const showFab = (editing) => {
      fabPane.classList.remove('d-none');

      fabPane.innerHTML = editing
        ? `
          <button type="button"
            class="btn btn-link btn-sm text-muted"
            id="authorChangeTypeFabBtn">
            ← Change type
          </button>
          <button type="button"
            class="btn btn-outline-secondary"
            id="authorCancelFabBtn">
            Cancel
          </button>
          <button type="button"
            class="btn btn-primary"
            id="authorSaveFabBtn">
            <i class="bi bi-check me-1"></i>Save
          </button>
        `
        : `
          <button type="button"
            class="btn btn-outline-secondary"
            id="authorCancelFabBtn">
            Cancel
          </button>
        `;

      document.getElementById('authorCancelFabBtn')
        .addEventListener('click', () => this._authorPane._destroy());

      if (!editing) return;

      document.getElementById('authorSaveFabBtn')
        .addEventListener('click', () => this._authorPane._save());

      document.getElementById('authorChangeTypeFabBtn')
        .addEventListener('click', () => {
          this._authorPane._destroyEditors();
          this._authorPane.selectedType = null;
          this._authorPane._renderTypePicker();
          showFab(false);
        });
    };

    const restoreFab = () => {
      fabPane.innerHTML = `
        <button type="button"
          class="btn btn-primary d-none"
          id="checkBtn">
          <i class="bi bi-check"></i>
          ${t(this._options.locale, 'verifyBtn')}
        </button>
        <button type="button"
          class="btn btn-danger d-none"
          id="quizSubmitBtn">
          ${t(this._options.locale, 'submitQuiz')}
        </button>
      `;

      this.checkBtn = document.getElementById('checkBtn');

      this.checkBtn.addEventListener(
        'click', () => this.doCheck()
      );

      document.getElementById('quizSubmitBtn')
        .addEventListener('click', () => this.doSubmit());

      fabPane.classList.remove('d-none');
      this._resetUI();
    };

    const closeAuthor = () => {
      container.classList.add('d-none');
      this._authorPane = null;
      restoreFab();
    };

    this._authorPane = new AuthorPane(container, {
      question,
      hideFooterBtns: true,

      onFormReady: () => showFab(true),
      onPickerReady: () => showFab(false),

      onSave: (savedQuestion) => {
        this.questionLoader.saveUserQuestion(savedQuestion);
        closeAuthor();

        this.questions ??= [];
        this.originalQuestions ??= [];

        const update = (questions) => {
          const index = questions.findIndex(
            q => q.id === savedQuestion.id
          );

          if (index >= 0) {
            questions[index] = savedQuestion;
          } else {
            questions.push(savedQuestion);
          }
        };

        update(this.questions);
        update(this.originalQuestions);

        const index = this.questions.findIndex(
          q => q.id === savedQuestion.id
        );

        this.setQuestion(index);
        this._showElement('content', true);
        this._showElement('editEmptyState', false);
        this._updateEditBtn();
      },

      onCancel: () => {
        closeAuthor();

        const hasQuestions = this.questions?.length > 0;

        this._showElement('content', hasQuestions);
        this._showElement('editEmptyState', !hasQuestions);
      },
    });

    showFab(Boolean(question));
  }

  _showElement(id, visible) {
    document.getElementById(id)
      ?.classList.toggle('d-none', !visible);
  }

  setEditable(editable) {
    this.questionPane.readOnly = !editable;
    this._showElement('editModeBadge', editable);
  }

  updateTimerDisplay() {
    const seconds = Math.max(0, this.timeRemaining || 0);

    document.getElementById('quizTimer').textContent =
      `⏱ ${this._formatTime(seconds)}`;
  }

  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
      .toString().padStart(2, '0');

    const secs = (seconds % 60)
      .toString().padStart(2, '0');

    return `${mins}:${secs}`;
  }

  showResultGrid() {
    document.getElementById('quizResults')?.remove();

    const content = document.getElementById('content');
    const root = content.parentElement;

    const correct = this.results.filter(r => r.correct).length;
    const total = this.results.length;

    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'quizResults';

    const heading = document.createElement('h4');
    heading.className = 'text-center mb-3';
    heading.textContent =
      `${t(this._options.locale, 'quizComplete')} ${correct} / ${total}`;

    resultsDiv.appendChild(heading);

    if (this._options.timer) {
      const used = this._options.timer -
        Math.max(0, this.timeRemaining || 0);

      const timeEl = document.createElement('p');
      timeEl.className = 'text-center text-muted small mb-2';
      timeEl.textContent =
        `${t(this._options.locale, 'timeUsed')} ${this._formatTime(used)}`;

      resultsDiv.appendChild(timeEl);
    }

    const nav = document.createElement('nav');
    const ul = document.createElement('ul');

    ul.id = 'resultGrid';
    ul.className = 'pagination flex-wrap justify-content-center';

    nav.appendChild(ul);
    resultsDiv.appendChild(nav);

    this.results.forEach((result, index) => {
      const li = document.createElement('li');
      const span = document.createElement('span');

      li.className = 'page-item m-1';
      li.style.cursor = 'pointer';

      const color = result.correct
        ? 'bg-success'
        : result.answered ? 'bg-danger' : 'bg-secondary';

      span.className = `page-link ${color} text-white`;
      span.textContent = index + 1;

      li.appendChild(span);

      li.addEventListener('click', () =>
        this._showResultQuestion(index)
      );

      ul.appendChild(li);
    });

    content.classList.add('d-none');
    root.appendChild(resultsDiv);
  }

  _showResultQuestion(index) {
    const resultsDiv = document.getElementById('quizResults');
    const content = document.getElementById('content');

    let backBtn = document.getElementById('backToResultsBtn');

    if (!backBtn) {
      backBtn = document.createElement('button');

      backBtn.id = 'backToResultsBtn';
      backBtn.className =
        'btn btn-outline-secondary btn-sm mb-2';

      backBtn.textContent =
        t(this._options.locale, 'backToResults');

      backBtn.addEventListener('click', () => {
        content.classList.add('d-none');
        resultsDiv.classList.remove('d-none');
        backBtn.remove();
      });

      content.parentElement.insertBefore(backBtn, content);
    }

    resultsDiv.classList.add('d-none');
    content.classList.remove('d-none');

    this.setQuestion(index);

    document.getElementById('quizSubmitBtn')
      .classList.add('d-none');

    const question = this.questions[index];
    const answer = this.userAnswers[question.id] || '';

    if (answer) {
      this._restoreAnswer(question, answer);
    }

    this.doExplain(true);

    const result = this.results[index];

    const label = result.correct
      ? 'correctAnswer'
      : result.answered ? 'wrongAnswer' : 'notAttempted';

    const color = result.correct
      ? 'btn-success'
      : result.answered ? 'btn-danger' : 'btn-secondary';

    this.explainToggleBtn.firstElementChild.textContent =
      t(this._options.locale, label);

    this.explainToggleBtn.classList.remove(
      'btn-success',
      'btn-danger',
      'btn-secondary',
      'd-none'
    );

    this.explainToggleBtn.classList.add(color);
  }

  _restoreAnswer(question, answerText) {
    const container = this.questionPane.answerContainer;

    switch (question.type) {
      case 'CHOOSE_THE_BEST': {
        container.querySelectorAll('input[type="radio"]')
          .forEach(input => {
            input.checked = input.value === answerText;
          });
        break;
      }

      case 'MULTI_CHOICE': {
        const selected = answerText
          .split(',')
          .map(id => id.trim());

        container.querySelectorAll('input[type="checkbox"]')
          .forEach(input => {
            input.checked = selected.includes(input.value);
          });
        break;
      }

      case 'TEXT_ANSWER':
      case 'NUMBER_ANSWER': {
        const input = container.querySelector(
          `[data-qid="${question.id}"]`
        );

        if (input) input.value = answerText;
        break;
      }
    }
  }

  destroy() {
    this._stopTimer();

    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }

    if (this._popstateHandler) {
      window.removeEventListener(
        'popstate', this._popstateHandler
      );
      this._popstateHandler = null;
    }

    this._authorPane?._destroyEditors?.();
    this._authorPane = null;
  }
}
