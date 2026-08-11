import QuestionPane from "./components/QuestionPane";
import AuthorPane from "./components/AuthorPane";
import { t } from "./i18n";
import { loadUserQuestions, saveUserQuestion, deleteUserQuestion } from "./storage";

export { loadUserQuestions, saveUserQuestion, deleteUserQuestion };

export default class PracticeMaker {
  constructor(_contentRoot, _options) {
    this.options = _options;
    this.mode = (_options && _options.mode) ? _options.mode : 'PRACTICE';
    this.complexity = (_options && _options.complexity) ? _options.complexity:null;
    this.timer = (_options && _options.timer) ? _options.timer : null;
    this.locale = (_options && _options.locale) ? _options.locale : 'en';
    const L = (key) => t(this.locale, key);
    _contentRoot.innerHTML = `
    <div id="content" class="d-none" data-type="question">
    <header
       class="navbar navbar-expand-lg navbar-light border-bottom sticky-md-top bg-body py-2 shadow-sm inner-section-header"
    >
       <div class="d-flex align-items-center w-100">
          
          <!-- NEW: Left-side Tags Container -->
          <div id="headerTagsContainer" class="d-flex align-items-center gap-1 flex-wrap me-auto">
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill d-inline-flex align-items-center">
              Neet
              <i class="bi bi-x ms-1 fs-6 tag-remove-btn" role="button" aria-label="Remove tag" style="cursor: pointer;" onclick="this.parentElement.remove()"></i>
          </span>
          <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill d-inline-flex align-items-center">
              JEE
              <i class="bi bi-x ms-1 fs-6 tag-remove-btn" role="button" aria-label="Remove tag" style="cursor: pointer;" onclick="this.parentElement.remove()"></i>
          </span>
          <span class="badge bg-info-subtle text-info border border-info-subtle rounded-pill d-inline-flex align-items-center">
              NATA
              <i class="bi bi-x ms-1 fs-6 tag-remove-btn" role="button" aria-label="Remove tag" style="cursor: pointer;" onclick="this.parentElement.remove()"></i>
          </span>
      </div>
          <div>
             <nav aria-label="breadcrumb">
                <ol class="breadcrumb mb-0 small text-muted"></ol>
             </nav>
             <h1 class="h5 mb-0 fw-bold"><span id="editModeBadge" class="badge bg-warning text-dark d-none"
             >${L('editModeBadge')}</span
          ></h1>
          </div>
          <ul
             class="navbar-nav ms-auto d-flex flex-row justify-content-evenly justify-content-lg-end mt-lg-0 pb-lg-0"
          >

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
                      Question 12 / 50
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
       

       <div
          id="quizTimer"
          class="d-none fw-bold fs-5 align-self-center me-3"
       ></div>
       

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

    <span id="editCounter" class="text-muted small fw-semibold d-none"></span>
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
    this.questionPane = new QuestionPane(this.shuffle);
    this.questionPane.readOnly = true;

    this.addActions();

    // Arrow key navigation
    this._keyHandler = (e) => {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' && !this.nextBtn.disabled) this.doNext();
      if (e.key === 'ArrowLeft'  && !this.prevBtn.disabled) this.doPrevious();
    };
    document.addEventListener('keydown', this._keyHandler);



  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  setQuestions(_questions) {
    

    /**
     * Filters a list of questions based on a target complexity level.
     * 
     * @param {Array} questions - The list of question objects to filter.
     * @param {string|null} targetComplexity - The complexity level ("H", "M", or null).
     * @returns {Array} The filtered subset of questions.
     */
    function filterQuestionsByComplexity(questions, targetComplexity) {
      if (!questions || !Array.isArray(questions)) return [];

      return questions.filter(q => {
        // If complexity is H: Do not filter (include everything)
        if (targetComplexity === "H") {
          return true;
        }
        
        // If complexity is M: Include questions with NO complexity + "M"
        if (targetComplexity === "M") {
          return !q.complexity || q.complexity === "M";
        }
        
        // If complexity is null: Include ONLY questions that do not have complexity
        return !q.complexity;
      });
    }

    this.questions = this.shuffle(filterQuestionsByComplexity(_questions,this.complexity));
    this.originalQuestions = JSON.parse(JSON.stringify(_questions));
    this.currentQuestionIndex = 0;
    this.userAnswers = {};

    if (this.questions.length === 0) {
      if (this.mode === 'EDIT') {
        document.getElementById('editEmptyState').classList.remove('d-none');
        document.getElementById('content').classList.add('d-none');
        document.getElementById('notfound').classList.add('d-none');
      } else {
        document.getElementById("notfound").classList.remove("d-none");
        document.getElementById("content").classList.add("d-none");
        const primaryAnchor = document.getElementById("notfound").querySelector("a.btn-primary");
        primaryAnchor.href = document.referrer;
        primaryAnchor.innerHTML = "Go Back";
      }
    } else {
      document.getElementById('editEmptyState').classList.add('d-none');
      document.getElementById("notfound").classList.add("d-none");

      let startIndex = 0;
      if (this.mode === 'EDIT') {
        const hash = window.location.hash;
        const idFromHash = hash.replace('#', '');
        const index = idFromHash ? this.questions.findIndex(q => q.id === idFromHash) : -1;
        startIndex = index !== -1 ? index : 0;
      }

      this.setQuestion(startIndex);
      document.getElementById("content").classList.remove("d-none");

      if (this.mode === 'EDIT') {
        document.getElementById('editControls').classList.remove('d-none');
        document.getElementById('editControls').classList.add('d-flex');
        this._updateEditBtn();
      }

      if (this.mode === 'QUIZ' && this.timer) {
        this.timeRemaining = this.timer;
        document.getElementById('quizTimer').classList.remove('d-none');
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
          this.timeRemaining--;
          this.updateTimerDisplay();
          if (this.timeRemaining <= 0) {
            clearInterval(this.timerInterval);
            this.doSubmit();
          }
        }, 1000);
      }
    }
  }

  setQuestion(questionIndex) {

    // save current answer before switching
    if (this.questionPane.getQuestion && this.questionPane.getQuestion()) {
      const currentQ = this.questionPane.getQuestion();
      this.userAnswers[currentQ.id] = this.questionPane.getAnswer();
    }

    // hide explain btn in PRACTICE mode when navigating
    if (this.checkBtn && !this.checkBtn.classList.contains("d-none")) {
      if (this.explainToggleBtn) this.explainToggleBtn.classList.add("d-none");
      this.doExplain(false);
    }

    const isLast  = questionIndex === this.questions.length - 1;
    const isFirst = questionIndex === 0;

    if (this.nextBtn) this.nextBtn.disabled = isLast;
    if (this.prevBtn) this.prevBtn.disabled = isFirst;

    // QUIZ: hide Next on last, show Submit; hide Submit on non-last, show Next
    if (this.mode === 'QUIZ') {
      this.nextBtn.classList.toggle('d-none', isLast);
      document.getElementById('quizSubmitBtn').classList.toggle('d-none', !isLast);
    }

    this.currentQuestionIndex = questionIndex;

    const counterEl = document.getElementById('questionCounter');
    if (counterEl && (this.mode === 'QUIZ' || this.mode === 'PRACTICE')) {
      counterEl.textContent = `Q ${questionIndex + 1} / ${this.questions.length}`;
      counterEl.classList.remove('d-none');
    }

    const q = this.questions[this.currentQuestionIndex];

    const container = document.getElementById("headerTagsContainer");

container.innerHTML = "";

if (q.tags?.length) {
    container.insertAdjacentHTML(
        "beforeend",
        '<i class="bi bi-tags me-2"></i>'
    );

    q.tags.forEach(tag => {
        const badge = document.createElement("span");
        badge.className = "badge border text-body me-1";
        badge.textContent = tag;
        container.appendChild(badge);
    });
}

    this.questionPane.setQuestion(q);

    // Restore saved answer when navigating back in QUIZ
    if (this.mode === 'QUIZ') {
      
      const saved = this.userAnswers[q.id];
      if (saved) this._restoreAnswer(q, saved);
    }

    // Load note for this question
    const noteKey = `practiceJs_note_${this.questions[this.currentQuestionIndex].id}`;
    const notesTextarea = document.getElementById('notesTextarea');
    if (notesTextarea) notesTextarea.value = localStorage.getItem(noteKey) || '';

    if (this.mode === 'EDIT') this._updateEditBtn();

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
    window.location.hash = this.questions[this.currentQuestionIndex].id;
  }

  doExplain(explain) {
    if (explain) {
      this.explainToggleBtn.classList.remove("btn-outline-primary");
      this.explainToggleBtn.classList.add("btn-primary");
    } else {
      this.explainToggleBtn.classList.remove("btn-primary");
      this.explainToggleBtn.classList.add("btn-outline-primary");
    }
    this.questionPane.doExplain(explain);
  }

  doSubmit() {
    // save current question's answer before scoring
    if (this.questionPane.getQuestion && this.questionPane.getQuestion()) {
      const currentQ = this.questionPane.getQuestion();
      this.userAnswers[currentQ.id] = this.questionPane.getAnswer();
    }

    this.results = [];

    for (let i = 0; i < this.questions.length; i++) {
      const question = this.questions[i];
      const answerText = this.userAnswers[question.id] || '';
      const answered = answerText !== '';
      const correct = this._checkAnswer(question, answerText);
      this.results.push({ correct, answered });
    }

    if (this.mode === 'QUIZ') {
      clearInterval(this.timerInterval);
      this.showResultGrid();
    }
  }

  _checkAnswer(question, answerText) {
    if (answerText === '') return false;
    let isCorrect = false;
    switch (question.type) {
      case "CHOOSE_THE_BEST": {
        const correctChoice = question.choices.find(
          (choice) => choice.answer === true
        );
        isCorrect = correctChoice && correctChoice.id === answerText;
        break;
      }
      case "MULTI_CHOICE": {
        const correctChoiceIds = question.choices
          .filter((choice) => choice.answer === true)
          .map((choice) => choice.id)
          .sort();
        const selectedChoiceIds = answerText
          .split(",")
          .map((id) => id.trim())
          .sort();
        isCorrect = selectedChoiceIds.length === correctChoiceIds.length &&
          selectedChoiceIds.every(id => correctChoiceIds.includes(id));
        break;
      }
      case "MATCH_THE_FOLLOWING": {
        if (this.originalQuestions) {
          const originalQuestion = this.originalQuestions.find(
            (q) => q.id === question.id
          );
          if (originalQuestion) {
            const ids = answerText.split(",");
            const n = originalQuestion.choices.length;
            const userChoiceIds = ids.slice(0, n);
            const userMatchIds = ids.slice(n, n * 2);
            const correctPairs = {};
            originalQuestion.choices.forEach((choice, i) => {
              correctPairs[choice.id] = originalQuestion.matches[i].id;
            });
            isCorrect = userChoiceIds.length === n &&
              userMatchIds.length === n &&
              userChoiceIds.every((cId, i) => correctPairs[cId] === userMatchIds[i]);
          }
        }
        break;
      }
      case "TEXT_ANSWER": {
        isCorrect = answerText.toLowerCase() === question.answer.toLowerCase();
        break;
      }
      case "NUMBER_ANSWER": {
        const parsed = parseFloat(answerText);
        isCorrect = !isNaN(parsed) && Math.abs(parsed - question.answer) < 0.0001;
        break;
      }
    }
    return isCorrect;
  }

  doCheck(silentMode) {
    const question = this.questionPane.getQuestion();
    const answerText = this.questionPane.getAnswer();

    if (answerText === "" && !silentMode) {
      this.options.error(t(this.locale, 'pleaseAnswer'));
      return false;
    }

    // MULTI_CHOICE needs live DOM highlighting — handle that here before delegating
    if (question.type === "MULTI_CHOICE") {
      const correctChoiceIds = question.choices
        .filter((choice) => choice.answer === true)
        .map((choice) => choice.id)
        .sort();

      const choiceListElement = this.questionPane.mcqList.element;
      const listItems = choiceListElement.querySelectorAll("li");
      listItems.forEach((liEl) => {
        const input = liEl.querySelector("input");
        const choiceId = input.value;
        if (input.checked) {
          if (correctChoiceIds.includes(choiceId)) {
            liEl.classList.add("bg-success", "text-white");
            liEl.classList.remove("bg-danger", "text-black");
          } else {
            liEl.classList.add("bg-danger", "text-white");
            liEl.classList.remove("bg-success", "text-black");
          }
        } else {
          liEl.classList.remove("bg-success", "bg-danger", "text-white");
          liEl.classList.add("text-black");
        }
      });

      const originalVerify = this.questionPane.verify;
      this.questionPane.verify = () => {};
      setTimeout(() => {
        this.questionPane.verify = originalVerify;
      }, 100);
    }

    const isCorrect = this._checkAnswer(question, answerText);

    if (isCorrect) {
      this.questionPane.verify(true);
      if (this.explainToggleBtn) {
        this.explainToggleBtn.firstElementChild.innerHTML = t(this.locale, 'correctAnswer');
        this.explainToggleBtn.classList.remove("btn-danger");
        this.explainToggleBtn.classList.add("btn-success");
        this.explainToggleBtn.classList.remove("d-none");
      }
    } else {
      this.questionPane.verify(false);
      if (this.explainToggleBtn) {
        this.explainToggleBtn.firstElementChild.innerHTML = t(this.locale, 'wrongAnswer');
        this.explainToggleBtn.classList.remove("btn-success");
        this.explainToggleBtn.classList.add("btn-danger");
        this.explainToggleBtn.classList.remove("d-none");
      }
    }
    return isCorrect;
  }

  addActions() {
    const navPane = document.getElementById("navPane");

    this.explainToggleBtn = document.getElementById("explainToggleBtn");
    this.explainToggleBtn.addEventListener("click", () =>
      this.doExplain(!this.explainToggleBtn.classList.contains("btn-primary"))
    );

    // Bottom bar buttons
    this.checkBtn   = document.getElementById('checkBtn');
    this.prevBtn    = document.getElementById('prevBtn');
    this.nextBtn    = document.getElementById('nextBtn');

    this.checkBtn.addEventListener("click", () => this.doCheck());
    this.prevBtn.addEventListener("click",  () => this.doPrevious());
    this.nextBtn.addEventListener("click",  () => this.doNext());

    if (this.mode === 'QUIZ') {
      this.checkBtn.classList.add('d-none');
      document.getElementById('quizSubmitBtn').addEventListener('click', () => this.doSubmit());
    }

    if (this.mode === 'EDIT') {
      this.checkBtn.classList.add('d-none');
      document.getElementById('editCounter').classList.remove('d-none');
      document.getElementById('editAddNavBtn').addEventListener('click', () => this.showAuthorPane(null));
      document.getElementById('editEmptyAddBtn').addEventListener('click', () => this.showAuthorPane(null));
      document.getElementById('questionPane').addEventListener('dblclick', () => {
        const q = this.questions[this.currentQuestionIndex];
        if (q && q._source === 'user') this.showAuthorPane(q);
      });
    }
  }

  _updateEditBtn() {
    const counter = document.getElementById('editCounter');
    if (counter) counter.textContent = `${this.currentQuestionIndex + 1} / ${this.questions.length}`;
    if (this.prevBtn) this.prevBtn.disabled = this.currentQuestionIndex === 0;
    if (this.nextBtn) this.nextBtn.disabled = this.currentQuestionIndex === this.questions.length - 1;
  }

  showAuthorPane(question) {
    document.getElementById('content').classList.add('d-none');
    document.getElementById('editEmptyState').classList.add('d-none');
    const container = document.getElementById('authorContainer');
    container.classList.remove('d-none');

    // Show fab with Save / Cancel
    const fabPane = document.getElementById('fabPane');

    const showFormFab = () => {
      fabPane.classList.remove('d-none');
      fabPane.innerHTML = `
        <button type="button" class="btn btn-link btn-sm text-muted" id="authorChangeTypeFabBtn">← Change type</button>
        <button type="button" class="btn btn-outline-secondary" id="authorCancelFabBtn">Cancel</button>
        <button type="button" class="btn btn-primary" id="authorSaveFabBtn"><i class="bi bi-check me-1"></i>Save</button>`;
      document.getElementById('authorChangeTypeFabBtn').addEventListener('click', () => {
        this._authorPane._destroyEditors();
        this._authorPane.selectedType = null;
        this._authorPane._renderTypePicker();
        showPickerFab();
      });
      document.getElementById('authorSaveFabBtn').addEventListener('click', () => this._authorPane._save());
      document.getElementById('authorCancelFabBtn').addEventListener('click', () => this._authorPane._destroy());
    };

    const showPickerFab = () => {
      fabPane.classList.remove('d-none');
      fabPane.innerHTML = `
        <button type="button" class="btn btn-outline-secondary" id="authorCancelFabBtn">Cancel</button>`;
      document.getElementById('authorCancelFabBtn').addEventListener('click', () => this._authorPane._destroy());
    };

    const restoreFab = () => {
      // Rebuild the original nav bar HTML (same as initial HTML in constructor)
      const L = (key) => t(this.locale, key);
      fabPane.innerHTML = `
        
        <span id="editCounter" class="text-muted small fw-semibold"></span>
        <button type="button" class="btn btn-primary d-none" id="checkBtn" title="Check Question">
          <i class="bi bi-check"></i> ${L('verifyBtn')}
        </button>
        <button id="quizSubmitBtn" type="button" class="btn btn-danger d-none">${L('submitQuiz')}</button>
        `;
      // Re-bind button references and listeners
      this.prevBtn  = document.getElementById('prevBtn');
      this.nextBtn  = document.getElementById('nextBtn');
      this.checkBtn = document.getElementById('checkBtn');
      this.prevBtn.addEventListener('click',  () => this.doPrevious());
      this.nextBtn.addEventListener('click',  () => this.doNext());
      fabPane.classList.remove('d-none');
    };

    this._authorPane = new AuthorPane(container, {
      question,
      hideFooterBtns: true,
      onFormReady: () => showFormFab(),
      onPickerReady: () => showPickerFab(),
      onSave: (q) => {
        container.classList.add('d-none');
        this._authorPane = null;
        restoreFab();
        const idx = this.questions.findIndex(x => x.id === q.id);
        if (idx >= 0) this.questions[idx] = q;
        else this.questions.push(q);
        this.setQuestion(this.questions.findIndex(x => x.id === q.id));
        document.getElementById('content').classList.remove('d-none');
        document.getElementById('editControls').classList.remove('d-none');
        document.getElementById('editControls').classList.add('d-flex');
        this._updateEditBtn();
      },
      onCancel: () => {
        container.classList.add('d-none');
        this._authorPane = null;
        restoreFab();
        if (this.questions.length === 0) {
          document.getElementById('editEmptyState').classList.remove('d-none');
        } else {
          document.getElementById('content').classList.remove('d-none');
        }
      },
    });

    // Initial fab state depends on whether type picker or form shown
    if (question) {
      showFormFab();
    } else {
      showPickerFab();
    }
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  }

  setEditable(bool) {
    this.questionPane.readOnly = !bool;
    const badge = document.getElementById('editModeBadge');
    if (bool) {
      badge.classList.remove('d-none');
    } else {
      badge.classList.add('d-none');
    }
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.timeRemaining / 60).toString().padStart(2, '0');
    const secs = (this.timeRemaining % 60).toString().padStart(2, '0');
    document.getElementById('quizTimer').textContent = `⏱ ${mins}:${secs}`;
  }

  showResultGrid() {
    const contentEl = document.getElementById('content');
    const root = contentEl.parentElement;

    // Remove any previous result panel
    const existing = document.getElementById('quizResults');
    if (existing) existing.remove();

    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'quizResults';

    const correct = this.results.filter(r => r.correct).length;
    const total = this.results.length;

    const heading = document.createElement('h4');
    heading.className = 'text-center mb-3';
    heading.textContent = `${t(this.locale, 'quizComplete')} ${correct} / ${total}`;

    if (this.timer) {
      const timeUsed = this.timer - (this.timeRemaining || 0);
      const mins = Math.floor(timeUsed / 60).toString().padStart(2, '0');
      const secs = (timeUsed % 60).toString().padStart(2, '0');
      const timeEl = document.createElement('p');
      timeEl.className = 'text-center text-muted small mb-2';
      timeEl.textContent = `${t(this.locale, 'timeUsed')} ${mins}:${secs}`;
      resultsDiv.appendChild(heading);
      resultsDiv.appendChild(timeEl);
    } else {
      resultsDiv.appendChild(heading);
    }

    const nav = document.createElement('nav');
    const ul = document.createElement('ul');
    ul.className = 'pagination flex-wrap justify-content-center';
    ul.id = 'resultGrid';
    nav.appendChild(ul);
    resultsDiv.appendChild(nav);

    contentEl.classList.add('d-none');
    root.appendChild(resultsDiv);

    this.results.forEach((r, i) => {
      const colorClass = r.correct ? 'bg-success text-white' : (r.answered ? 'bg-danger text-white' : 'bg-secondary text-white');
      const li = document.createElement('li');
      li.className = 'page-item m-1';
      li.style.cursor = 'pointer';
      const span = document.createElement('span');
      span.className = `page-link ${colorClass}`;
      span.textContent = i + 1;
      li.appendChild(span);
      li.addEventListener('click', () => this._showResultQuestion(i));
      ul.appendChild(li);
    });
  }

  _showResultQuestion(index) {
    const resultsDiv = document.getElementById('quizResults');
    const contentEl = document.getElementById('content');

    if (!document.getElementById('backToResultsBtn')) {
      const backBtn = document.createElement('button');
      backBtn.id = 'backToResultsBtn';
      backBtn.className = 'btn btn-outline-secondary btn-sm mb-2';
      backBtn.textContent = t(this.locale, 'backToResults');
      backBtn.addEventListener('click', () => {
        contentEl.classList.add('d-none');
        backBtn.remove();
        resultsDiv.classList.remove('d-none');
      });
      contentEl.parentElement.insertBefore(backBtn, contentEl);
    }

    resultsDiv.classList.add('d-none');
    contentEl.classList.remove('d-none');

    this.setQuestion(index);
    document.getElementById('quizSubmitBtn').classList.add('d-none');

    const question = this.questions[index];
    const savedAnswer = this.userAnswers[question.id] || '';
    if (savedAnswer) {
      this._restoreAnswer(question, savedAnswer);
    }

    this.doExplain(true);

    const r = this.results[index];
    if (this.explainToggleBtn) {
      const label = r.correct ? t(this.locale, 'correctAnswer') : (r.answered ? t(this.locale, 'wrongAnswer') : t(this.locale, 'notAttempted'));
      const btnClass = r.correct ? 'btn-success' : (r.answered ? 'btn-danger' : 'btn-secondary');
      this.explainToggleBtn.firstElementChild.textContent = label;
      this.explainToggleBtn.classList.remove('btn-success', 'btn-danger', 'btn-secondary', 'd-none');
      this.explainToggleBtn.classList.add(btnClass);
    }
  }

  _restoreAnswer(question, answerText) {
    switch (question.type) {
      case 'CHOOSE_THE_BEST': {
        const inputs = this.questionPane.answerContainer.querySelectorAll('input[type="radio"]');
        inputs.forEach(input => { input.checked = input.value === answerText; });
        break;
      }
      case 'MULTI_CHOICE': {
        const selected = answerText.split(',').map(s => s.trim());
        const inputs = this.questionPane.answerContainer.querySelectorAll('input[type="checkbox"]');
        inputs.forEach(input => { input.checked = selected.includes(input.value); });
        break;
      }
      case 'TEXT_ANSWER': {
        const inp = this.questionPane.answerContainer.querySelector(`[data-qid="${question.id}"]`);
        if (inp) inp.value = answerText;
        break;
      }
      case 'NUMBER_ANSWER': {
        const inp = this.questionPane.answerContainer.querySelector(`[data-qid="${question.id}"]`);
        if (inp) inp.value = answerText;
        break;
      }
    }
  }
}
