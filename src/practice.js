import QuestionPane from "./components/QuestionPane";

export default class PracticeMaker {
  constructor(_contentRoot, _notiFyFn) {
    this.notiFyFn = _notiFyFn;
    _contentRoot.innerHTML = `
                <div id="content" class="d-none" data-type="question">
              <div id="navPane" class="d-flex">
                  <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-1">
                    </div>
                  </div>
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
                    <!-- <button type="button" class="btn btn-primary d-none" title="Save Question">
                      <i class="bi fa-floppy-disk"></i> | Save&nbsp;
                      </button> -->
                    <button type="button" class="btn btn-primary" title="Check Question">
                        <i class="bi bi-check"></i> | Verify</button>
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
            </div>
            <div id="notfound" class="row d-none">
              <div class="d-flex align-items-center justify-content-center">
                  <div class="text-center">
                    <p class="fs-3">There are no questions</p>
                    <a href="/" class="btn btn-primary">Go Home</a>
                  </div>
              </div>
            </div>
            `;
    this.questionPane = new QuestionPane(this.shuffle);
    this.questionPane.readOnly = true;

    this.addActions();

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

    if (this.questions.length === 0) {
      console.log("Empty Questions");
      document.getElementById("notfound").classList.remove("d-none");
      document.getElementById("content").classList.add("d-none");
      const primaryAnchor = document
        .getElementById("notfound")
        .querySelector("a.btn-primary");
      primaryAnchor.href = document.referrer;
      primaryAnchor.innerHTML = "Go Back";
    } else {

      const hash = window.location.hash; // "#q5" or "#123"
      const idFromHash = hash.replace("#", "");
      const index = this.questions.findIndex(
        q => q.id === idFromHash
      );

      this.setQuestion(index != -1 ? index : 0);
      document.getElementById("notfound").classList.add("d-none");
      document.getElementById("content").classList.remove("d-none");
    }
  }

  setQuestion(questionIndex) {

    

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
    this.questionPane.setQuestion(this.questions[this.currentQuestionIndex]);
    
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
    console.log("Submit Button clicked");

    const statusTxt = document.getElementById("statusTxt");

    statusTxt.innerHTML = "";

    const cIndex = this.currentQuestionIndex;

    let correctAnswers = 0;

    for (let i = 0; i < this.questions.length; i++) {
      this.setQuestion(i);
      if (this.doCheck(true)) {
        correctAnswers++;
      }
    }

    this.setQuestion(cIndex);

    statusTxt.innerHTML =
      "<span class='text-primary'>Congratulations !</span> You Scored <span class='text-success'>" +
      correctAnswers +
      "</span> out of " +
      this.questions.length;
  }

  doCheck(silentMode) {
    const question = this.questionPane.getQuestion();
    const answerText = this.questionPane.getAnswer();
    let isCorrect = false;

    if (answerText === "" && !silentMode) {
      this.notiFyFn.error("Please Select Answer");
    } else {
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

          isCorrect = selectedChoiceIds.length === correctChoiceIds.length &&
            selectedChoiceIds.every(id => correctChoiceIds.includes(id));

          const originalVerify = this.questionPane.verify;
            this.questionPane.verify = () => {}; 
          setTimeout(() => {
            this.questionPane.verify = originalVerify;
          }, 100);

          break;
        }
        case "MATCH_THE_FOLLOWING": {
          if (this.originalQuestions) {
            const originalQuestion = this.originalQuestions.find(
              (q) => q.id === question.id
            );

            if (originalQuestion) {
              const fullList = [
                ...originalQuestion.choices,
                ...originalQuestion.matches.slice(
                  0,
                  originalQuestion.choices.length
                ),
              ];
              const correctAnswer = fullList.map((item) => item.id).join(",");
              isCorrect = correctAnswer === answerText;
            }
          }
          break;
        }
      }

      if (isCorrect) {
        this.questionPane.verify(true);

        if (this.explainToggleBtn) {
          this.explainToggleBtn.firstElementChild.innerHTML = "Correct Answer |"
          this.explainToggleBtn.classList.remove("btn-danger");
          this.explainToggleBtn.classList.add("btn-success");
          this.explainToggleBtn.classList.remove("d-none");
        }
      } else {
        this.questionPane.verify(false);

        if (this.explainToggleBtn) {
          this.explainToggleBtn.firstElementChild.innerHTML = "Wrong Answer |"
          this.explainToggleBtn.classList.remove("btn-success");
          this.explainToggleBtn.classList.add("btn-danger");
          this.explainToggleBtn.classList.remove("d-none");
        }
      }
      return isCorrect;
    }
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
  }
}
