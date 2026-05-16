import EasyMDE from 'easymde';
import { saveUserQuestion } from '../storage';

const TYPES = [
  { value: 'CHOOSE_THE_BEST',    label: 'Choose the Best (single correct)' },
  { value: 'MULTI_CHOICE',       label: 'Multi Choice (multiple correct)' },
  { value: 'TEXT_ANSWER',        label: 'Text Answer' },
  { value: 'NUMBER_ANSWER',      label: 'Number Answer' },
  { value: 'MATCH_THE_FOLLOWING',label: 'Match the Following' },
];

export default class AuthorPane {
  /**
   * @param {HTMLElement} containerEl  — element to render into
   * @param {{ onSave, onCancel, question }} opts
   *   question: existing user question (edit) or null (new)
   */
  constructor(containerEl, { onSave, onCancel, question, hideFooterBtns = false, onFormReady, onPickerReady }) {
    this.containerEl   = containerEl;
    this.onSave        = onSave;
    this.onCancel      = onCancel;
    this.hideFooterBtns = hideFooterBtns;
    this.onFormReady   = onFormReady || null;
    this.onPickerReady = onPickerReady || null;
    this.question    = question;   // null = new
    this.selectedType = question ? question.type : null;
    this.qEditor     = null;       // EasyMDE instance
    this.eEditor     = null;       // EasyMDE explanation instance

    this._render();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _render() {
    if (this.selectedType) {
      this._renderForm();
    } else {
      this._renderTypePicker();
    }
  }

  _renderTypePicker() {
    this.containerEl.innerHTML = `
      <div class="p-3">
        <h6 class="mb-3 fw-semibold">Choose question type</h6>
        <div class="d-flex flex-column gap-2" id="typePicker">
          ${TYPES.map(t => `
            <button type="button" class="btn btn-outline-secondary text-start" data-type="${t.value}">
              ${t.label}
            </button>`).join('')}
        </div>
        <div class="mt-3${this.hideFooterBtns ? ' d-none' : ''}">
          <button type="button" class="btn btn-sm btn-link text-muted" id="authorCancelBtn">Cancel</button>
        </div>
      </div>`;

    this.containerEl.querySelectorAll('[data-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedType = btn.dataset.type;
        this._renderForm();
      });
    });
    this.containerEl.querySelector('#authorCancelBtn').addEventListener('click', () => this.onCancel());

    if (this.onPickerReady) this.onPickerReady();
  }

  _renderForm() {
    const q = this.question;
    this.containerEl.innerHTML = `
      <div class="p-3">
        <div class="row g-3">

          <!-- Left: question + explanation editors -->
          <div class="col-12 col-md-6 d-flex flex-column gap-3">
            <div>
              <label class="form-label fw-semibold small">Question</label>
              <textarea id="authorQTxt" rows="4"></textarea>
            </div>
            <div>
              <label class="form-label fw-semibold small">Explanation <span class="text-muted fw-normal">(optional)</span></label>
              <textarea id="authorETxt" rows="3"></textarea>
            </div>
          </div>

          <!-- Right: type-specific inputs -->
          <div class="col-12 col-md-6" id="authorChoicesCol">
            ${this._renderChoicesHTML()}
          </div>

        </div>

        <!-- Footer -->
        <div class="d-flex gap-2 mt-3${this.hideFooterBtns ? ' d-none' : ''}">
          <button type="button" class="btn btn-primary btn-sm" id="authorSaveBtn">Save</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" id="authorCancelBtn">Cancel</button>
          ${!q ? `<button type="button" class="btn btn-link btn-sm text-muted ms-auto" id="authorBackBtn">← Change type</button>` : ''}
        </div>
      </div>`;

    // Mount EasyMDE
    this.qEditor = new EasyMDE({
      element: this.containerEl.querySelector('#authorQTxt'),
      minHeight: '120px',
      toolbar: ['bold', 'italic', 'code', '|', 'unordered-list', 'ordered-list'],
      spellChecker: false,
    });
    this.eEditor = new EasyMDE({
      element: this.containerEl.querySelector('#authorETxt'),
      minHeight: '80px',
      toolbar: ['bold', 'italic', 'code'],
      spellChecker: false,
    });

    // Pre-fill if editing
    if (q) {
      this.qEditor.value(q.question || '');
      this.eEditor.value(q.explanation || '');
    }

    // Wire dynamic choice inputs
    this._wireDynamicInputs();

    // Pre-fill choices if editing
    if (q) this._prefillChoices(q);

    // Buttons
    this.containerEl.querySelector('#authorSaveBtn').addEventListener('click', () => this._save());
    this.containerEl.querySelector('#authorCancelBtn').addEventListener('click', () => this._destroy());
    const backBtn = this.containerEl.querySelector('#authorBackBtn');
    if (backBtn) backBtn.addEventListener('click', () => {
      this._destroyEditors();
      this.selectedType = null;
      this._renderTypePicker();
    });

    if (this.onFormReady) this.onFormReady();
  }

  // ── Choice HTML by type ───────────────────────────────────────────────────

  _renderChoicesHTML() {
    switch (this.selectedType) {
      case 'CHOOSE_THE_BEST':
        return this._choiceListHTML('radio');
      case 'MULTI_CHOICE':
        return this._choiceListHTML('checkbox');
      case 'TEXT_ANSWER':
        return `
          <label class="form-label fw-semibold small">Correct answer</label>
          <input type="text" class="form-control" id="authorTextAnswer" placeholder="Enter correct answer">`;
      case 'NUMBER_ANSWER':
        return `
          <label class="form-label fw-semibold small">Correct answer</label>
          <input type="number" class="form-control" id="authorNumAnswer" placeholder="Enter number">`;
      case 'MATCH_THE_FOLLOWING':
        return this._matchHTML();
      default:
        return '';
    }
  }

  _choiceListHTML(inputType) {
    return `
      <label class="form-label fw-semibold small">
        Choices <span class="text-muted fw-normal">(tick correct)</span>
      </label>
      <div id="authorChoiceList" class="d-flex flex-column gap-2">
        ${this._choiceRowHTML(inputType, 0)}
      </div>`;
  }

  _choiceRowHTML(inputType, idx) {
    return `
      <div class="d-flex align-items-center gap-2 author-choice-row">
        <input type="${inputType}" name="authorCorrect" class="form-check-input flex-shrink-0 mt-0" value="${idx}">
        <input type="text" class="form-control form-control-sm author-choice-input" placeholder="Choice ${idx + 1}">
        <button type="button" class="btn btn-sm btn-link text-danger p-0 author-choice-del" title="Remove">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>`;
  }

  _matchHTML() {
    return `
      <label class="form-label fw-semibold small">Match pairs</label>
      <div class="row g-1 mb-1">
        <div class="col-6"><small class="text-muted">Items (left)</small></div>
        <div class="col-6"><small class="text-muted">Matches (right)</small></div>
      </div>
      <div id="authorMatchList" class="d-flex flex-column gap-2">
        ${this._matchRowHTML(0)}
      </div>
      <div class="mt-2">
        <small class="text-muted">Distractors (right-only, no pair)</small>
      </div>
      <div id="authorDistractorList" class="d-flex flex-column gap-2 mt-1">
        ${this._distractorRowHTML(0)}
      </div>`;
  }

  _matchRowHTML(idx) {
    return `
      <div class="d-flex align-items-center gap-1 author-match-row" data-idx="${idx}">
        <div class="d-flex flex-column gap-1 me-1">
          <button type="button" class="btn btn-sm btn-link p-0 text-secondary match-up" title="Move up"><i class="bi bi-arrow-up"></i></button>
          <button type="button" class="btn btn-sm btn-link p-0 text-secondary match-down" title="Move down"><i class="bi bi-arrow-down"></i></button>
        </div>
        <input type="text" class="form-control form-control-sm match-item" placeholder="Item ${idx + 1}">
        <input type="text" class="form-control form-control-sm match-pair" placeholder="Match ${idx + 1}">
        <button type="button" class="btn btn-sm btn-link text-danger p-0 match-del" title="Remove"><i class="bi bi-x-lg"></i></button>
      </div>`;
  }

  _distractorRowHTML(idx) {
    return `
      <div class="d-flex align-items-center gap-1 author-distractor-row">
        <input type="text" class="form-control form-control-sm distractor-input" placeholder="Distractor ${idx + 1}">
        <button type="button" class="btn btn-sm btn-link text-danger p-0 distractor-del" title="Remove"><i class="bi bi-x-lg"></i></button>
      </div>`;
  }

  // ── Dynamic input wiring ──────────────────────────────────────────────────

  _wireDynamicInputs() {
    const type = this.selectedType;

    if (type === 'CHOOSE_THE_BEST' || type === 'MULTI_CHOICE') {
      const list = this.containerEl.querySelector('#authorChoiceList');
      if (list) {
        this._wireChoiceList(list, type === 'CHOOSE_THE_BEST' ? 'radio' : 'checkbox');
      }
    }

    if (type === 'MATCH_THE_FOLLOWING') {
      const matchList      = this.containerEl.querySelector('#authorMatchList');
      const distractorList = this.containerEl.querySelector('#authorDistractorList');
      if (matchList)      this._wireMatchList(matchList);
      if (distractorList) this._wireDistractorList(distractorList);
    }
  }

  _wireChoiceList(list, inputType) {
    // Delegate: handle input (append), delete, using event delegation
    list.addEventListener('input', (e) => {
      if (!e.target.classList.contains('author-choice-input')) return;
      const rows = list.querySelectorAll('.author-choice-row');
      const lastRow = rows[rows.length - 1];
      const lastInput = lastRow.querySelector('.author-choice-input');
      if (e.target === lastInput && e.target.value.trim() !== '') {
        const idx = rows.length;
        const div = document.createElement('div');
        div.innerHTML = this._choiceRowHTML(inputType, idx);
        list.appendChild(div.firstElementChild);
      }
    });

    list.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.author-choice-del');
      if (!delBtn) return;
      const rows = list.querySelectorAll('.author-choice-row');
      if (rows.length > 1) delBtn.closest('.author-choice-row').remove();
    });
  }

  _wireMatchList(list) {
    list.addEventListener('input', (e) => {
      if (!e.target.classList.contains('match-item') && !e.target.classList.contains('match-pair')) return;
      const rows = list.querySelectorAll('.author-match-row');
      const lastRow = rows[rows.length - 1];
      const lastItem = lastRow.querySelector('.match-item');
      const lastPair = lastRow.querySelector('.match-pair');
      if ((e.target === lastItem || e.target === lastPair) &&
          (lastItem.value.trim() !== '' || lastPair.value.trim() !== '')) {
        const idx = rows.length;
        const div = document.createElement('div');
        div.innerHTML = this._matchRowHTML(idx);
        list.appendChild(div.firstElementChild);
        this._wireMatchRowArrows(list);
      }
    });

    list.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.match-del');
      if (!delBtn) return;
      const rows = list.querySelectorAll('.author-match-row');
      if (rows.length > 1) delBtn.closest('.author-match-row').remove();
    });

    this._wireMatchRowArrows(list);
  }

  _wireMatchRowArrows(list) {
    list.querySelectorAll('.match-up').forEach(btn => {
      btn.onclick = () => {
        const row = btn.closest('.author-match-row');
        const prev = row.previousElementSibling;
        if (prev) list.insertBefore(row, prev);
      };
    });
    list.querySelectorAll('.match-down').forEach(btn => {
      btn.onclick = () => {
        const row = btn.closest('.author-match-row');
        const next = row.nextElementSibling;
        if (next) list.insertBefore(next, row);
      };
    });
  }

  _wireDistractorList(list) {
    list.addEventListener('input', (e) => {
      if (!e.target.classList.contains('distractor-input')) return;
      const rows = list.querySelectorAll('.author-distractor-row');
      const lastInput = rows[rows.length - 1].querySelector('.distractor-input');
      if (e.target === lastInput && e.target.value.trim() !== '') {
        const idx = rows.length;
        const div = document.createElement('div');
        div.innerHTML = this._distractorRowHTML(idx);
        list.appendChild(div.firstElementChild);
      }
    });

    list.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.distractor-del');
      if (!delBtn) return;
      const rows = list.querySelectorAll('.author-distractor-row');
      if (rows.length > 1) delBtn.closest('.author-distractor-row').remove();
    });
  }

  // ── Pre-fill choices when editing ────────────────────────────────────────

  _prefillChoices(q) {
    const type = this.selectedType;

    if (type === 'CHOOSE_THE_BEST' || type === 'MULTI_CHOICE') {
      const list      = this.containerEl.querySelector('#authorChoiceList');
      const inputType = type === 'CHOOSE_THE_BEST' ? 'radio' : 'checkbox';
      if (!list || !q.choices) return;
      list.innerHTML = '';
      q.choices.forEach((c, i) => {
        const div = document.createElement('div');
        div.innerHTML = this._choiceRowHTML(inputType, i);
        const row = div.firstElementChild;
        row.querySelector('.author-choice-input').value = c.choice;
        if (c.answer) row.querySelector('input[type]').checked = true;
        list.appendChild(row);
      });
      // append one blank
      const div = document.createElement('div');
      div.innerHTML = this._choiceRowHTML(inputType, q.choices.length);
      list.appendChild(div.firstElementChild);
      this._wireChoiceList(list, inputType);
    }

    if (type === 'TEXT_ANSWER') {
      const el = this.containerEl.querySelector('#authorTextAnswer');
      if (el) el.value = q.answer || '';
    }

    if (type === 'NUMBER_ANSWER') {
      const el = this.containerEl.querySelector('#authorNumAnswer');
      if (el) el.value = q.answer != null ? q.answer : '';
    }

    if (type === 'MATCH_THE_FOLLOWING') {
      const matchList      = this.containerEl.querySelector('#authorMatchList');
      const distractorList = this.containerEl.querySelector('#authorDistractorList');
      if (!matchList || !q.choices) return;

      // choices with answer:true are pairs; others are distractors
      const pairs      = q.choices.filter(c => c.answer);
      const distractors = q.choices.filter(c => !c.answer);
      const matches    = q.matches || [];

      matchList.innerHTML = '';
      pairs.forEach((c, i) => {
        const m = matches.find(m => m.id === c.match) || {};
        const div = document.createElement('div');
        div.innerHTML = this._matchRowHTML(i);
        const row = div.firstElementChild;
        row.querySelector('.match-item').value = c.choice;
        row.querySelector('.match-pair').value = m.match || '';
        matchList.appendChild(row);
      });
      const div = document.createElement('div');
      div.innerHTML = this._matchRowHTML(pairs.length);
      matchList.appendChild(div.firstElementChild);
      this._wireMatchList(matchList);

      if (distractorList) {
        distractorList.innerHTML = '';
        distractors.forEach((c, i) => {
          const d = document.createElement('div');
          d.innerHTML = this._distractorRowHTML(i);
          d.firstElementChild.querySelector('.distractor-input').value = c.choice;
          distractorList.appendChild(d.firstElementChild);
        });
        const d = document.createElement('div');
        d.innerHTML = this._distractorRowHTML(distractors.length);
        distractorList.appendChild(d.firstElementChild);
        this._wireDistractorList(distractorList);
      }
    }
  }

  // ── Build question object ─────────────────────────────────────────────────

  _buildQuestion() {
    const id       = this.question ? this.question.id : 'user_' + Date.now();
    const qText    = this.qEditor.value().trim();
    const eText    = this.eEditor.value().trim();
    const type     = this.selectedType;

    if (!qText) { alert('Question text is required.'); return null; }

    const base = { id, type, question: qText, _source: 'user' };
    if (eText) base.explanation = eText;

    if (type === 'CHOOSE_THE_BEST' || type === 'MULTI_CHOICE') {
      const rows = this.containerEl.querySelectorAll('.author-choice-row');
      const choices = [];
      rows.forEach((row, i) => {
        const text = row.querySelector('.author-choice-input').value.trim();
        if (!text) return;
        const checked = row.querySelector('input[type="radio"],input[type="checkbox"]').checked;
        choices.push({ id: `${id}-c${i}`, choice: text, answer: checked });
      });
      if (choices.length < 2) { alert('Add at least 2 choices.'); return null; }
      if (!choices.some(c => c.answer)) { alert('Mark at least one correct answer.'); return null; }
      return { ...base, choices };
    }

    if (type === 'TEXT_ANSWER') {
      const ans = this.containerEl.querySelector('#authorTextAnswer').value.trim();
      if (!ans) { alert('Correct answer is required.'); return null; }
      return { ...base, answer: ans };
    }

    if (type === 'NUMBER_ANSWER') {
      const raw = this.containerEl.querySelector('#authorNumAnswer').value;
      if (raw === '') { alert('Correct answer is required.'); return null; }
      return { ...base, answer: Number(raw) };
    }

    if (type === 'MATCH_THE_FOLLOWING') {
      const matchRows     = this.containerEl.querySelectorAll('.author-match-row');
      const distractorRows = this.containerEl.querySelectorAll('.author-distractor-row');
      const choices = [];
      const matches = [];

      matchRows.forEach((row, i) => {
        const item  = row.querySelector('.match-item').value.trim();
        const pair  = row.querySelector('.match-pair').value.trim();
        if (!item && !pair) return;
        const mId = `${id}-m${i}`;
        choices.push({ id: `${id}-c${i}`, choice: item, match: mId, answer: true });
        matches.push({ id: mId, match: pair });
      });

      distractorRows.forEach((row, i) => {
        const text = row.querySelector('.distractor-input').value.trim();
        if (!text) return;
        const mId = `${id}-d${i}`;
        choices.push({ id: `${id}-dc${i}`, choice: text, match: null, answer: false });
        matches.push({ id: mId, match: text });
      });

      if (choices.filter(c => c.answer).length < 2) { alert('Add at least 2 match pairs.'); return null; }
      return { ...base, choices, matches };
    }

    return null;
  }

  // ── Save / destroy ────────────────────────────────────────────────────────

  async _save() {
    const q = this._buildQuestion();
    if (!q) return;
    try {
      await saveUserQuestion(q);
    } catch (e) {
      alert('Failed to save question: ' + e.message);
      return;
    }
    this._destroyEditors();
    this.onSave(q);
  }

  _destroy() {
    this._destroyEditors();
    this.onCancel();
  }

  _destroyEditors() {
    if (this.qEditor) { try { this.qEditor.toTextArea(); } catch(e) {} this.qEditor = null; }
    if (this.eEditor) { try { this.eEditor.toTextArea(); } catch(e) {} this.eEditor = null; }
  }
}
