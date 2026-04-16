// Use the pre-compiled .mjs file for best compatibility with Rollup
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';


export default class ChoiceList {
  constructor(isPracticeMode, templateName, choices, keepOrder) {

    var templateEL = document.createElement('template');
    templateEL.innerHTML = `<ul class="list-group">
    <li class="list-group-item p-0"><label for="c1" class="d-flex align-items-center p-2 w-100 m-0"><input class="form-check-input me-2" type="radio" name="flexRadioDefault" id="c1">
      <span class="form-check-label w-100">Option 1</span></label>
   </li>
   <li class="list-group-item p-0"><label for="c2" class="d-flex align-items-center p-2 w-100 m-0"><input class="form-check-input me-2" type="radio" name="flexRadioDefault" id="c2">
      <span class="form-check-label w-100">Option 2</span></label>
   </li>
   <li class="list-group-item p-0"><label for="c3" class="d-flex align-items-center p-2 w-100 m-0"><input class="form-check-input me-2" type="radio" name="flexRadioDefault" id="c3">
      <span class="form-check-label w-100">Option 3</span></label>
   </li>
   <li class="list-group-item p-0"><label for="c4" class="d-flex align-items-center p-2 w-100 m-0"><input class="form-check-input me-2" type="radio" name="flexRadioDefault" id="c4">
      <span class="form-check-label w-100">Option 4</span></label>
   </li>
   <li class="list-group-item p-0"><label for="c5" class="d-flex align-items-center p-2 w-100 m-0"><input class="form-check-input me-2" type="radio" name="flexRadioDefault" id="c5">
      <span class="form-check-label w-100">Option 5</span></label>
   </li>
  </ul>`;
    templateEL.id = "radioList"
    document.body.appendChild(templateEL);

    var templateCL = document.createElement('template');
    templateCL.innerHTML = `<ul class="list-group">
    <li class="list-group-item p-0"><label for="mc1" class="d-flex align-items-center p-2 w-100 m-0"><input class="form-check-input me-2" type="checkbox" name="mc1" id="mc1">
      <span class="form-check-label w-100">Option 1</span></label>
   </li>
   <li class="list-group-item p-0"><label for="mc2" class="d-flex align-items-center p-2 w-100 m-0"><input class="form-check-input me-2" type="checkbox" name="mc2" id="mc2">
      <span class="form-check-label w-100">Option 2</span></label>
   </li>
   <li class="list-group-item p-0"><label for="mc3" class="d-flex align-items-center p-2 w-100 m-0"><input class="form-check-input me-2" type="checkbox" name="mc3" id="mc3">
      <span class="form-check-label w-100">Option 3</span></label>
   </li>
   <li class="list-group-item p-0"><label for="mc4" class="d-flex align-items-center p-2 w-100 m-0"><input class="form-check-input me-2" type="checkbox" name="mc4" id="mc4">
      <span class="form-check-label w-100">Option 4</span></label>
   </li>
   <li class="list-group-item p-0"><label for="mc5" class="d-flex align-items-center p-2 w-100 m-0"><input class="form-check-input me-2" type="checkbox" name="mc5" id="mc5">
      <span class="form-check-label w-100">Option 5</span></label>
   </li>
  </ul>`;
    templateCL.id = "checkboxList"
    document.body.appendChild(templateCL);

    var templateML = document.createElement('template');
    templateML.innerHTML = `<ul class="list-group">
    <li class="list-group-item d-flex align-items-center">
      <span><span class="justify-content-start"><i class="bi bi-arrow-up px-2"></i><i class="bi bi-arrow-down"></i></span></span>
      <div class="form-check"><label class="form-check-label"></label></div>
   </li>
   <li class="list-group-item d-flex align-items-center">
      <span><span class="justify-content-start"><i class="bi bi-arrow-up px-2"></i><i class="bi bi-arrow-down"></i></span></span>
      <div class="form-check"><label class="form-check-label"></label></div>
   </li>
   <li class="list-group-item d-flex align-items-center">
      <span><span class="justify-content-start"><i class="bi bi-arrow-up px-2"></i><i class="bi bi-arrow-down"></i></span></span>
      <div class="form-check"><label class="form-check-label"></label></div>
   </li>
   <li class="list-group-item d-flex align-items-center">
      <span><span class="justify-content-start"><i class="bi bi-arrow-up px-2"></i><i class="bi bi-arrow-down"></i></span></span>
      <div class="form-check"><label class="form-check-label"></label></div>
   </li>
   <li class="list-group-item d-flex align-items-center">
      <span><span class="justify-content-start"><i class="bi bi-arrow-up px-2"></i><i class="bi bi-arrow-down"></i></span></span>
      <div class="form-check"><label class="form-check-label"></label></div>
   </li>
  </ul>`;
    templateML.id = "matchesList"
    document.body.appendChild(templateML);


    const template = document.getElementById(templateName);

    this._element = template.content.cloneNode(true).firstChild;
    this._element.container = this;

    let length = 0;



    if (templateName === "matchesList") {
      this.isMatches = true;
      choices.forEach((choice, index) => {
        const liEl = this._element.children[index];
        const labelEl = liEl.querySelector("label");
        labelEl.attributes["data-id"] = choice.id;
        labelEl.textContent = choice.label;

        liEl
          .querySelector("i.bi-arrow-up")
          .addEventListener("click", (event) => {
            const liEl = event.currentTarget.parentElement.parentElement.parentElement;  // current value

            if (liEl.parentElement.firstChild === liEl) {

              liEl.parentNode.appendChild(liEl);
            } else {
              liEl.parentNode.insertBefore(liEl, liEl.previousElementSibling);
            }
          });

        liEl
          .querySelector("i.bi-arrow-down")
          .addEventListener("click", (event) => {
            const liEl = event.currentTarget.closest("li");
            const ulNode = liEl.parentNode;
            if (liEl === ulNode.lastElementChild) {
              ulNode.insertBefore(liEl, ulNode.firstElementChild);
            } else {
              ulNode.insertBefore(liEl.nextElementSibling, liEl);
            }
          });

        length++;
      });
    } else {
      choices.forEach((choice, index) => {
        const liEl = this._element.children[index];
        const input = liEl.querySelector("input");
        input.value = choice.id;
        input.name = `c${choices[0].id}`;
        input.id = choice.id;
        const clabel = liEl.querySelector("label");
        clabel.htmlFor = choice.id;
        clabel.querySelector("span").textContent = choice.label;

        renderMathInElement(clabel.querySelector("span"), {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ]
        });

        if (isPracticeMode) {
          input.checked = choice.answer;
        }
        length++;
      });
    }

    // Remove Unused Items
    const total = this._element.children.length;
    for (let index = length; index < total; index++) {
      this._element.removeChild(this._element.children[length]);
    }
  }

  get answer() {
    this.reset();

    const answers = [];
    if (this.isMatches) {
      this._element
        .querySelectorAll("label")
        .forEach((element) => answers.push(element.attributes["data-id"]));
    } else {
      const selectedCheckBoxes = this._element.querySelectorAll("input");
      selectedCheckBoxes.forEach((input) => {
        if (input.checked) {
          answers.push(input.value);
        }
      });
    }

    console.log(answers);

    return answers;
  }

  get element() {
    return this._element;
  }

  reset() {
    this._element.querySelectorAll("li").forEach((liEl) => {
      liEl.classList.remove("bg-success");
      liEl.classList.remove("bg-danger");
    });
  }

 verify(success) {
  if (success) {
    if (this.isMatches) {
      this._element.querySelectorAll("li").forEach((liEl) => {
        liEl.classList.add("bg-success", "text-white");
        liEl.classList.remove("bg-danger", "text-black");
      });
    } else {
      this._element.querySelectorAll("li").forEach((liEl) => {
        const input = liEl.querySelector("input");
        if (input.checked) {
          liEl.classList.add("bg-success", "text-white");
          liEl.classList.remove("bg-danger", "text-black");
        } else {
          liEl.classList.remove("bg-success", "bg-danger", "text-white");
          liEl.classList.add("text-black");
        }
      });
    }
  } else {
    if (this.isMatches) {
      this._element.querySelectorAll("li").forEach((liEl) => {
        liEl.classList.add("bg-danger", "text-white");
        liEl.classList.remove("bg-success", "text-black");
      });
    } else {
      this._element.querySelectorAll("li").forEach((liEl) => {
        const input = liEl.querySelector("input");
        if (input.checked) {
          liEl.classList.add("bg-danger", "text-white");
          liEl.classList.remove("bg-success", "text-black");
        } else {
          liEl.classList.remove("bg-success", "bg-danger", "text-white");
          liEl.classList.add("text-black");
        }
      });
    }
  }
}
}
