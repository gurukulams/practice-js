import QuestionPane from "./components/QuestionPane";
import { t } from "./i18n";

export default class PracticeMaker {
  constructor(_contentRoot, _notiFyFn) {
    this.notiFyFn = _notiFyFn;
    this.mode = (_notiFyFn && _notiFyFn.mode) ? _notiFyFn.mode : 'PRACTICE';
    this.timer = (_notiFyFn && _notiFyFn.timer) ? _notiFyFn.timer : null;
    this.locale = (_notiFyFn && _notiFyFn.locale) ? _notiFyFn.locale : 'en';
    const L = (key) => t(this.locale, key);
    _contentRoot.innerHTML = `
                <div id="content" class="d-none" data-type="question">
              <div id="navPane" class="d-flex">
                  <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-1">
                      <span id="editModeBadge" class="badge bg-warning text-dark d-none">${L('editModeBadge')}</span>
                    </div>
                  </div>
                  <div id="quizTimer" class="d-none fw-bold fs-5 align-self-center"></div>
                  <div id="questionCounter" class="d-none fw-semibold text-muted align-self-center me-2"></div>
                  <div>
                    <button type="button" class="btn d-none px-2 mx-2 text-white border-dark-subtle" data-bs-toggle="tooltip"
                        data-bs-placement="bottom" title="Explain">
                        <span></span>
                        <i class="bi bi-question"></i>
                    </button>
                  </div>
                  <div>
                    <nav aria-label="Page Navigation">
                        <ul class="pagination">
                            <li class="page-item" title="Previous Question"><a class="page-link" href="javascript://" aria-label="Previous"><span aria-hidden="true"><i class="bi bi-arrow-left"></i></span></a></li>
                            <li class="page-item" title="Next Question"><a class="page-link" href="javascript://" aria-label="Next"><span aria-hidden="true"><i class="bi bi-arrow-right"></i></span></a></li>
                        </ul>
                    </nav>
                  </div>
                  <div id="fabPane" class="dropup btn-group position-fixed bottom-0 end-0 rounded-circle me-2 mb-4 z-3">
                    <button type="button" class="btn btn-primary" title="Check Question">
                        <i class="bi bi-check"></i> | ${L('verifyBtn')}</button>
                    <button id="quizSubmitBtn" type="button" class="btn btn-danger d-none">${L('submitQuiz')}</button>
                  </div>
              </div>
              <div id="questionPane" class="row h-50">
                  <div class="col-12 col-md-6">
                      <span id="questionContainer" class="lead"><textarea class="form-control h-100" placeholder="Question" id="qTxt" rows="3"></textarea></span>
                    <div class="form-floating mb-3 h-100" id="matcheContainer"></div>
                  </div>
                  <div class="col-12 col-md-6">
                      <span id="explanationContainer" class="d-none"><textarea class="form-control h-100" placeholder="Explanation" id="eTxt" rows="3"></textarea></span>
                    <div class="form-floating mb-3 h-100" id="answerContainer"></div>
                  </div>
              </div>
              <div id="notesPanel" class="mt-3 px-1">
                <button class="btn btn-sm btn-outline-secondary" type="button" id="notesToggleBtn">
                  <i class="bi bi-journal-text me-1"></i>${L('myNotes')}
                </button>
                <div id="notesBody" class="d-none mt-2">
                  <textarea id="notesTextarea" class="form-control font-monospace" rows="4" placeholder="${L('notesPlaceholder')}"></textarea>
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
            `;
    this.questionPane = new QuestionPane(this.shuffle);
    this.questionPane.readOnly = true;

    this.addActions();

    // Notes toggle
    document.getElementById('notesToggleBtn').addEventListener('click', () => {
      document.getElementById('notesBody').classList.toggle('d-none');
    });

    // Auto-save notes on input
    document.getElementById('notesTextarea').addEventListener('input', () => {
      const q = this.questionPane.getQuestion();
      if (q) localStorage.setItem(`practiceJs_note_${q.id}`, document.getElementById('notesTextarea').value);
    });

  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  setQuestions(_questions) {
    this.questions = this.shuffle(_questions);
    this.originalQuestions = JSON.parse(JSON.stringify(_questions));
    this.currentQuestionIndex = 0;
    this.userAnswers = {};

    if (this.questions.length === 0) {
      document.getElementById("notfound").classList.remove("d-none");
      document.getElementById("content").classList.add("d-none");
      const primaryAnchor = document
        .getElementById("notfound")
        .querySelector("a.btn-primary");
      primaryAnchor.href = document.referrer;
      primaryAnchor.innerHTML = "Go Back";
    } else {

      this.setQuestion(0);
      document.getElementById("notfound").classList.add("d-none");
      document.getElementById("content").classList.remove("d-none");

      if (this.mode === 'QUIZ' && this.timer) {
        this.timeRemaining = this.timer;
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

    // is Practice Mode
    if (this.checkBtn && !this.checkBtn.classList.contains("d-none")) {
      this.explainToggleBtn.classList.add("d-none");
      this.doExplain(false);
    }

    if (questionIndex === this.questions.length - 1) {
      this.nextBtn.classList.add("disabled");
    } else {
      this.nextBtn.classList.remove("disabled");
    }

    if (questionIndex === 0) {
      this.previousBtn.classList.add("disabled");
    } else {
      this.previousBtn.classList.remove("disabled");
    }

    this.currentQuestionIndex = questionIndex;

    const counterEl = document.getElementById('questionCounter');
    if (counterEl && this.mode === 'QUIZ') {
      counterEl.textContent = `Q ${questionIndex + 1} / ${this.questions.length}`;
      counterEl.classList.remove('d-none');
    }

    if (this.mode === 'QUIZ') {
      const isLast = questionIndex === this.questions.length - 1;
      document.getElementById('quizSubmitBtn').classList.toggle('d-none', !isLast);
    }

    this.questionPane.setQuestion(this.questions[this.currentQuestionIndex]);

    // Load note for this question
    const noteKey = `practiceJs_note_${this.questions[this.currentQuestionIndex].id}`;
    const notesTextarea = document.getElementById('notesTextarea');
    if (notesTextarea) notesTextarea.value = localStorage.getItem(noteKey) || '';

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
      this.notiFyFn.error(t(this.locale, 'pleaseAnswer'));
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
    const fabPane = document.getElementById("fabPane");

    fabPane.querySelectorAll("i").forEach((element) => {
      const classList = element.classList;
      if  (classList.contains("bi-check")) {
        this.checkBtn = element.parentElement;
        element.parentElement.addEventListener("click", () => this.doCheck());
      }
    });

    navPane.querySelectorAll("i").forEach((element) => {
      const classList = element.classList;
      if (classList.contains("bi-question")) {
        this.explainToggleBtn = element.parentElement;
        this.explainToggleBtn.addEventListener("click", () =>
          this.doExplain(
            !this.explainToggleBtn.classList.contains("btn-primary")
          )
        );
      }
    });

    navPane.querySelectorAll("a.page-link").forEach((element) => {
      if (element.ariaLabel === "Next") {
        this.nextBtn = element;
        element.addEventListener("click", () => this.doNext());
      } else if (element.ariaLabel === "Previous") {
        this.previousBtn = element;
        element.addEventListener("click", () => this.doPrevious());
      }
    });

    if (this.mode === 'QUIZ') {
      this.checkBtn.classList.add('d-none');
      document.getElementById('quizSubmitBtn').addEventListener('click', () => this.doSubmit());
    }
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
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
        const inp = document.getElementById('textAnswerInput');
        if (inp) inp.value = answerText;
        break;
      }
      case 'NUMBER_ANSWER': {
        const inp = document.getElementById('numberAnswerInput');
        if (inp) inp.value = answerText;
        break;
      }
    }
  }
}
