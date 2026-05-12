import ChoiceList from "./ChoiceList";
import { marked } from "marked";
// Use the pre-compiled .mjs file for best compatibility with Rollup
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';

export default class QuestionPane {
  
  constructor(_suffleFn) {
    this.shuffle = _suffleFn;
    this.questionPane = document.getElementById("questionPane");

    this.answerContainer = document.getElementById("answerContainer");
    this.questionContainer = document.getElementById("questionContainer");
    this.matcheContainer = document.getElementById("matcheContainer");
    this.explanationContainer = document.getElementById("explanationContainer");

    this.readOnly = true;

  }

  verify(success) {
    switch (this.question.type) {
      case "CHOOSE_THE_BEST":
        this.chooseTheBestList.verify(success)
        break;
      case "MULTI_CHOICE":
        this.mcqList.verify(success)
        break;
      case "MATCH_THE_FOLLOWING":
        this.mtfList.verify(success)
        break;
      case "TEXT_ANSWER":
        // no visual highlight needed for text input
        break;
      case "NUMBER_ANSWER":
        // no visual list to highlight; result shown via explainToggleBtn
        break;
    }
  }

  getAnswer() {
    let answer ;

    switch (this.question.type) {
      case "CHOOSE_THE_BEST":
        answer = this.chooseTheBestList.answer.join(",");
        break;
      case "MULTI_CHOICE":
        answer = this.mcqList.answer.join(",");
        break;
      case "MATCH_THE_FOLLOWING":
        const matches = this.mtfList.answer;
        const choices = this.mtfChoicesList.answer;

        choices.push(matches.slice(0, choices.length));


        answer = choices.join(",");
        break;
      case "TEXT_ANSWER":
        answer = this.answerContainer.querySelector(`[data-qid="${this.question.id}"]`)
          ? this.answerContainer.querySelector(`[data-qid="${this.question.id}"]`).value.trim()
          : '';
        break;
      case "NUMBER_ANSWER":
        answer = this.answerContainer.querySelector(`[data-qid="${this.question.id}"]`)
          ? this.answerContainer.querySelector(`[data-qid="${this.question.id}"]`).value.trim()
          : '';
        break;
    }

    return answer;

  }

  getQuestion() {
    return this.question;
  }

  setQuestion(_question) {
    this.question = _question;

    this.questionContainer.innerHTML = marked(_question.question || '');

    renderMathInElement(this.questionContainer, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ]
    });

    this.explanationContainer.innerHTML = marked(_question.explanation ? _question.explanation : "");

    renderMathInElement(this.explanationContainer, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ]
    });

    this.questionContainer.classList.remove('d-none');
    this.matcheContainer.classList.add('d-none');

    const answerComponent = this.getAnswerComponent( _question.id);
    if(!answerComponent) {
      switch (_question.type) {
        case "CHOOSE_THE_BEST":
          this.chooseTheBestList = new ChoiceList(this.isEditable, "radioList", this.shuffle(_question.choices));
          this.answerContainer.appendChild(this.chooseTheBestList.element);
          this.chooseTheBestList.element.name = _question.id;
          break;
        case "MULTI_CHOICE":
          this.mcqList = new ChoiceList(this.isEditable,"checkboxList", this.shuffle(_question.choices));
          this.answerContainer.appendChild(this.mcqList.element);
          this.mcqList.element.name = _question.id;
          break;
        case "MATCH_THE_FOLLOWING":
          this.mtfList = new ChoiceList(this.isEditable,"matchesList", this.shuffle(_question.matches));
          this.answerContainer.appendChild(this.mtfList.element);
          this.mtfList.element.name = _question.id;
  
          this.mtfChoicesList = new ChoiceList(this.isEditable,"matchesList", _question.choices, true);
          
          break;
        case "TEXT_ANSWER": {
          const wrapper = document.createElement('div');
          wrapper.className = 'mt-3';
          wrapper.name = _question.id;
          const label = document.createElement('label');
          label.className = 'form-label fw-semibold';
          label.textContent = this.isEditable ? 'Correct Answer' : 'Your answer';
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'form-control form-control-lg';
          input.id = 'textAnswerInput';
          input.dataset.qid = _question.id;
          if (this.isEditable) {
            input.value = _question.answer || '';
            input.readOnly = true;
            input.className += ' bg-light text-muted';
          } else {
            input.placeholder = 'Type your answer...';
            input.value = '';
          }
          wrapper.appendChild(label);
          wrapper.appendChild(input);
          this.answerContainer.appendChild(wrapper);
          break;
        }
        case "NUMBER_ANSWER": {
          const wrapper = document.createElement('div');
          wrapper.className = 'mt-3';
          wrapper.name = _question.id;
          const label = document.createElement('label');
          label.className = 'form-label fw-semibold';
          label.textContent = this.isEditable ? 'Correct Answer' : 'Your answer';
          const input = document.createElement('input');
          input.type = 'number';
          input.className = 'form-control form-control-lg';
          input.id = 'numberAnswerInput';
          input.dataset.qid = _question.id;
          if (this.isEditable) {
            input.value = _question.answer != null ? _question.answer : '';
            input.readOnly = true;
            input.className += ' bg-light text-muted';
          } else {
            input.placeholder = 'Enter a number...';
            input.value = '';
          }
          wrapper.appendChild(label);
          wrapper.appendChild(input);
          this.answerContainer.appendChild(wrapper);
          break;
        }
      }
    } else {
      switch (_question.type) {
        case "CHOOSE_THE_BEST":
          this.chooseTheBestList = answerComponent.container ;
          break;
        case "MULTI_CHOICE":
          this.mcqList = answerComponent.container ;
          break;
        case "MATCH_THE_FOLLOWING":
          this.mtfList = answerComponent.container ;
  
          this.mtfChoicesList = new ChoiceList(this.isEditable,"matchesList", _question.choices, true);
          
          break;
        case "TEXT_ANSWER":
          answerComponent.querySelector('#textAnswerInput').value = '';
          break;
        case "NUMBER_ANSWER":
          answerComponent.querySelector('#numberAnswerInput').value = '';
          break;
      }
    }

    if(_question.type === "MATCH_THE_FOLLOWING") {
      this.matcheContainer.innerHTML = '<p class="text-muted small mb-1 fw-semibold">Match each item →</p>';
          this.matcheContainer.appendChild(this.mtfChoicesList.element);
          this.mtfChoicesList.element.querySelectorAll("li>span").forEach(element=> {
            element.parentElement.removeChild(element);
          })
          this.matcheContainer.classList.remove('d-none');
          this.questionContainer.classList.add('d-none');

          // Add header above right (answer) list
          const existingHdr = this.answerContainer.querySelector('.mtf-header');
          if (!existingHdr) {
            const hdr = document.createElement('p');
            hdr.className = 'text-muted small mb-1 fw-semibold mtf-header';
            hdr.textContent = '← Reorder to match';
            this.answerContainer.insertBefore(hdr, this.mtfList.element);
          }

          renderMathInElement(this.mtfList.element, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false }
            ]
          });
          renderMathInElement(this.mtfChoicesList.element, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false }
            ]
          });

    }
    


  }

  getAnswerComponent(questionId) {
    const answerComponents = this.answerContainer.childNodes;
    let answerComponent;

    answerComponents.forEach(element => {
      if(questionId === element.name) {
        element.classList.remove('d-none');
        answerComponent = element;
      } else {
        element.classList.add('d-none');
      }
    })
    return answerComponent;
  }

  set readOnly(flag) {
    this.isEditable = !flag;
    if(this.question) {
      this.setQuestion(this.question)
    }
  }
  
  doExplain(flag) {
    if(flag) {
      this.explanationContainer.classList.remove("d-none");
      this.answerContainer.classList.add("d-none");
    } else {
      this.explanationContainer.classList.add("d-none");
      this.answerContainer.classList.remove("d-none");
    }

  }
  
}
