/**
 * @fileoverview Practice Playground Application Controller Module.
 * Manages UI state, localization, question loading, and PracticeMaker instances.
 */

/**
 * @typedef {Object} PageTranslation
 * @property {string} appTitle - Title of the application.
 * @property {string} options - Text for options button/header.
 * @property {string} modeLabel - Label for mode dropdown.
 * @property {string} timerLabel - Label for timer settings.
 * @property {string} maxQLabel - Label for max questions input.
 * @property {string} applyBtn - Text for apply button.
 * @property {string} timerRadio - Label for timer radio toggle.
 * @property {string} maxQRadio - Label for max questions radio toggle.
 * @property {string} questionsJson - Label for questions JSON section.
 * @property {string} jsonDesc - Description for JSON editor.
 * @property {string} resetBtn - Text for reset button.
 * @property {string} loadBtn - Text for load button.
 * @property {string} loadSuccess - Success message on JSON load.
 * @property {string} loadFail - Error message on failed load.
 */

/**
 * i18n Dictionary for application strings.
 * @type {Record<string, PageTranslation>}
 */
 export const PAGE_STRINGS = {
    en: {
      appTitle: 'Practice.js Playground',
      options: 'Options',
      modeLabel: 'Mode',
      timerLabel: 'Timer (s)',
      maxQLabel: 'Max Q',
      applyBtn: 'Apply',
      timerRadio: 'Timer',
      maxQRadio: 'Max Q',
      questionsJson: 'Questions JSON',
      jsonDesc: 'Edit the JSON below and click <strong>Load</strong> to apply changes. This updates the current session only.',
      resetBtn: 'Reset',
      loadBtn: 'Load',
      loadSuccess: 'Questions loaded successfully.',
      loadFail: 'Failed to load questions: ',
    },
    ta: {
      appTitle: 'Practice.js விளையாட்டரங்கு',
      options: 'விருப்பங்கள்',
      modeLabel: 'முறை',
      timerLabel: 'நேரம் (வி)',
      maxQLabel: 'அதிக கே',
      applyBtn: 'பயன்படுத்து',
      timerRadio: 'நேரம்',
      maxQRadio: 'அதிக கே',
      questionsJson: 'கேள்விகள் JSON',
      jsonDesc: 'கீழே உள்ள JSON-ஐ திருத்தி <strong>ஏற்று</strong> என்பதை கிளிக் செய்யவும்.',
      resetBtn: 'மீட்டமை',
      loadBtn: 'ஏற்று',
      loadSuccess: 'கேள்விகள் வெற்றிகரமாக ஏற்றப்பட்டன.',
      loadFail: 'கேள்விகளை ஏற்ற தோல்வி: ',
    }
  };
  
  export const STORAGE_KEYS = {
    LANG: 'selectedLanguage',
    Q_PATH_URL: 'practiceJs_qPathUrl',
    USER_QUESTIONS: 'practiceJs_userQuestions'
  };
  
  /**
   * Main application controller for the Playground.
   */
  export class PlaygroundApp {
    /** @type {Array<Object>|null} */
    #questionsOverride = null;
    /** @type {'PRACTICE'|'QUIZ'|'EDIT'} */
    #mode = 'PRACTICE';
    /** @type {string} */
    #locale = 'en';
    /** @type {Object|null} */
    #practiceMakerInstance = null;
    /** @type {Record<string, HTMLElement>} */
    #dom = {};
  
    /**
     * Initializes the application and caches DOM element references.
     */
    constructor() {
      this.#cacheDomElements();
    }
  
    /**
     * Caches critical DOM references to avoid repeated queries.
     * @private
     */
    #cacheDomElements() {
      const ids = [
        'alertArea', 'langSelect', 'modeSelect', 'complexityCmb',
        'practiceSettingsSection', 'quizSettingsSection', 'jsonEditorSection',
        'jsonBtns', 'practiceMaxQInput', 'practiceMaxQHint', 'timerInput',
        'maxQInput', 'quizMaxQHint', 'optionsModal', 'questionsJsonArea',
        'jsonErrorMsg', 'loadJsonBtn', 'resetJsonBtn', 'optionsApplyBtn',
        'qPathInput', 'practice-main'
      ];
  
      ids.forEach((id) => {
        this.#dom[id] = document.getElementById(id);
      });
    }
  
    /**
     * Displays a alert banner inside the alert area.
     * @param {string} message - Message to display.
     * @param {'danger'|'success'|'warning'|'info'} [type='danger'] - Alert style variant.
     */
    showAlert(message, type = 'danger') {
      if (!this.#dom.alertArea) return;
  
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
        <div class="alert alert-${type} alert-dismissible" role="alert">
          <div>${message}</div>
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;
  
      this.#dom.alertArea.innerHTML = '';
      this.#dom.alertArea.append(wrapper);
    }
  
    /**
     * Translates static UI elements using data-i18n attributes.
     * @param {string} [locale=this.#locale] - Target locale code.
     */
    applyPageLocale(locale = this.#locale) {
      this.#locale = locale;
      const strings = PAGE_STRINGS[this.#locale] || PAGE_STRINGS.en;
  
      document.querySelectorAll('[data-i18n="appTitle"]').forEach((el) => {
        el.textContent = strings.appTitle;
      });
      document.querySelectorAll('[data-i18n="options"]').forEach((el) => {
        el.textContent = strings.options;
      });
  
      const modeLabel = document.querySelector('[data-i18n="modeLabel"]');
      if (modeLabel) modeLabel.textContent = strings.modeLabel;
  
      const maxQLabel = document.querySelector('label[for="maxQInput"]');
      if (maxQLabel) maxQLabel.textContent = strings.maxQLabel;
  
      if (this.#dom.resetJsonBtn) {
        this.#dom.resetJsonBtn.innerHTML = `<i class="bi bi-arrow-counterclockwise me-1"></i>${strings.resetBtn}`;
      }
      if (this.#dom.loadJsonBtn) {
        this.#dom.loadJsonBtn.innerHTML = `<i class="bi bi-upload me-1"></i>${strings.loadBtn}`;
      }
    }
  
    /**
     * Rebuilds the current PracticeMaker instance.
     * @private
     * @param {number} timer - Quiz timer duration (seconds).
     * @param {number|null} maxQ - Maximum number of questions.
     * @param {string|null} complexity - Target question complexity level.
     * @returns {Object} Fresh PracticeMaker instance.
     */
    async #buildInstance(timer = 0, maxQ = null, complexity = null) {
      const root = this.#dom['practice-main'];
  
      // Destroy existing instance to clear running timers
      if (this.#practiceMakerInstance?.destroy) {
        this.#practiceMakerInstance.destroy();
      } else if (window.__prakticeMaker?.destroy) {
        window.__prakticeMaker.destroy();
      }
  
      if (root) root.innerHTML = '';
  
      const questionPath = this.#dom.qPathInput?.value.trim() || '';
      const options = {
        mode: this.#mode,
        complexity,
        locale: this.#locale,
        maxQ: maxQ,
        shuffle: false,
        repoUrl: this.#questionsOverride ? undefined : `/data/${questionPath}`,
        questions: this.#questionsOverride || undefined,
        includeUserQuestions: !this.#questionsOverride,
        languageCode: this.#locale,
      };
  
      if (this.#mode === 'QUIZ' && timer > 0) {
        options.timer = timer;
      }
  
      // Instantiates PracticeMaker library instance
      const pm = new PracticeMaker.default(root, options);
      pm.setEditable(this.#mode === 'EDIT');
  
      this.#practiceMakerInstance = pm;
      window.__prakticeMaker = pm; // Kept for backward compatibility with global checks
      await pm.ready;
      return pm;
    }
  
    /**
     * Applies selected configuration mode and updates UI controls.
     */
    async applyMode() {
      this.#mode = this.#dom.modeSelect.value;
      let timer = 0;
      let maxQ = null;
      let complexity = null;
  
      const rawComplexity = this.#dom.complexityCmb?.value.trim();
      if (rawComplexity) {
        complexity = rawComplexity;
      }
  
      if (this.#mode === 'PRACTICE') {
        const raw = parseInt(this.#dom.practiceMaxQInput.value, 10);
        if (!isNaN(raw) && raw > 0) {
          maxQ = raw;
        }
      }
  
      if (this.#mode === 'QUIZ') {
        const timerRaw = parseInt(this.#dom.timerInput.value, 10);
        timer = !isNaN(timerRaw) && timerRaw > 0 ? timerRaw : 0;
  
        const maxQRaw = parseInt(this.#dom.maxQInput.value, 10);
        maxQ = !isNaN(maxQRaw) && maxQRaw > 0 ? maxQRaw : null;
      }
  
      try {
        await this.#buildInstance(timer, maxQ, complexity);
        this.syncQuizSection();
        return true;
      } catch (error) {
        const failMessage = (PAGE_STRINGS[this.#locale] || PAGE_STRINGS.en).loadFail;
        this.showAlert(`${failMessage}${error.message}`, 'danger');
        return false;
      }
    }
  
    /**
     * Synchronizes settings panels visibility based on selected mode.
     */
    syncQuizSection() {
      const mode = this.#dom.modeSelect.value;
      const isQuiz = mode === 'QUIZ';
      const isEdit = mode === 'EDIT';
      const isPractice = mode === 'PRACTICE';
  
      this.#dom.practiceSettingsSection?.classList.toggle('d-none', !isPractice);
      this.#dom.quizSettingsSection?.classList.toggle('d-none', !isQuiz);
      this.#dom.jsonEditorSection?.classList.toggle('d-none', !isEdit);
      this.#dom.jsonBtns?.classList.toggle('d-none', !isEdit);
  
      const totalQuestions = this.#practiceMakerInstance?.originalQuestions?.length || 0;
  
      if (isPractice && this.#dom.practiceMaxQInput) {
        this.#dom.practiceMaxQInput.max = totalQuestions;
        this.#dom.practiceMaxQInput.placeholder = `all (${totalQuestions})`;
        if (this.#dom.practiceMaxQHint) {
          this.#dom.practiceMaxQHint.textContent = `(max ${totalQuestions})`;
        }
      }
  
      if (isQuiz && this.#dom.maxQInput) {
        this.#dom.maxQInput.max = totalQuestions;
        this.#dom.maxQInput.placeholder = `all (${totalQuestions})`;
        if (this.#dom.quizMaxQHint) {
          this.#dom.quizMaxQHint.textContent = `(max ${totalQuestions})`;
        }
      }
    }
  
    /**
     * Synchronizes and attaches modal event listeners.
     * @private
     */
    #setupModalEvents() {
      const { optionsModal, questionsJsonArea, jsonErrorMsg, loadJsonBtn, resetJsonBtn, optionsApplyBtn } = this.#dom;
      if (!optionsModal) return;
  
      optionsModal.addEventListener('show.bs.modal', () => {
        const questions = this.#practiceMakerInstance?.originalQuestions || this.#questionsOverride || [];
        questionsJsonArea.value = JSON.stringify(questions, null, 2);
        jsonErrorMsg.classList.add('d-none');
        jsonErrorMsg.textContent = '';
        this.syncQuizSection();
      });
  
      loadJsonBtn?.addEventListener('click', async () => {
        jsonErrorMsg.classList.add('d-none');
        try {
          const parsed = JSON.parse(questionsJsonArea.value);
          if (!Array.isArray(parsed)) {
            throw new Error('Root value must be a JSON array.');
          }
          this.#questionsOverride = parsed;
          this.#mode = this.#dom.modeSelect.value;
          if (!(await this.applyMode())) return;
  
          bootstrap.Modal.getInstance(optionsModal).hide();
          const msg = (PAGE_STRINGS[this.#locale] || PAGE_STRINGS.en).loadSuccess;
          this.showAlert(msg, 'success');
        } catch (e) {
          jsonErrorMsg.textContent = `JSON error: ${e.message}`;
          jsonErrorMsg.classList.remove('d-none');
        }
      });
  
      resetJsonBtn?.addEventListener('click', () => {
        const questions = this.#practiceMakerInstance?.originalQuestions || this.#questionsOverride || [];
        questionsJsonArea.value = JSON.stringify(questions, null, 2);
        jsonErrorMsg.classList.add('d-none');
      });
  
      optionsApplyBtn?.addEventListener('click', () => {
        const mode = this.#dom.modeSelect.value;
  
        if (mode === 'QUIZ') {
          const timerVal = this.#dom.timerInput.value;
          const maxQVal = this.#dom.maxQInput.value;
          const timerNum = parseInt(timerVal, 10);
          const maxQNum = parseInt(maxQVal, 10);
  
          if (timerVal !== '' && (!Number.isInteger(timerNum) || timerNum <= 0)) {
            this.showAlert('Timer must be at least 1 second.', 'danger');
            return;
          }
          if (maxQVal !== '' && (!Number.isInteger(maxQNum) || maxQNum <= 0)) {
            this.showAlert('Max Questions must be at least 1.', 'danger');
            return;
          }
        }
  
        if (mode === 'PRACTICE') {
          const pVal = this.#dom.practiceMaxQInput.value;
          const pNum = parseInt(pVal, 10);
          if (pVal !== '' && (!Number.isInteger(pNum) || pNum <= 0)) {
            this.showAlert('Questions to show must be at least 1.', 'danger');
            return;
          }
        }
  
        bootstrap.Modal.getInstance(optionsModal).hide();
        this.applyMode();
      });
    }
  
    /**
     * Attaches navigation bar and control listeners.
     * @private
     */
    #setupControlListeners() {
      this.#dom.langSelect?.addEventListener('change', async (e) => {
        const selectedLang = e.target.value;
        await this.changeLanguage(selectedLang);
      });
  
      this.#dom.modeSelect?.addEventListener('change', () => {
        this.syncQuizSection();
        this.#mode = this.#dom.modeSelect.value;
        this.applyMode();
      });
  
      const { qPathInput } = this.#dom;
      if (qPathInput) {
        const savedUrl = localStorage.getItem(STORAGE_KEYS.Q_PATH_URL);
        if (savedUrl) qPathInput.value = savedUrl;
  
        qPathInput.addEventListener('blur', () => this.loadDataAndRender());
        qPathInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.loadDataAndRender();
          }
        });
      }
    }
  
    /**
     * Loads remote/local stored question sets and renders the app.
     */
    async loadDataAndRender() {
      const params = new URLSearchParams(window.location.search);
      const paramMode = params.get('mode');
      const paramTimer = parseInt(params.get('timer'), 10) || 0;
      const paramEditable = params.get('editable');
  
      if (paramMode && ['PRACTICE', 'QUIZ', 'EDIT'].includes(paramMode)) {
        this.#mode = paramMode;
        this.#dom.modeSelect.value = paramMode;
        this.syncQuizSection();
      }
  
      if (paramTimer > 0) {
        this.#dom.timerInput.value = paramTimer;
      }

      this.#questionsOverride = null;
      const trimmedUrl = this.#dom.qPathInput.value.trim();
      localStorage.setItem(STORAGE_KEYS.Q_PATH_URL, trimmedUrl);
      this.syncQuizSection();
      await this.applyMode();
  
      if (paramEditable === '1') {
        this.#practiceMakerInstance?.setEditable(true);
      }
    }
  
    /**
     * Changes active language, reloading questions while preserving question position.
     * Prevents random shuffling so questions match 1:1 between languages.
     * @param {string} selectedLang - Selected language code ('en' or 'ta').
     */
    async changeLanguage(selectedLang) {
      localStorage.setItem(STORAGE_KEYS.LANG, selectedLang);
      this.#locale = selectedLang;
      this.applyPageLocale(selectedLang);

      const currentIdx = this.#practiceMakerInstance?.currentQuestionIndex ?? 0;
      const preservedAnswers = this.#practiceMakerInstance?.userAnswers ? { ...this.#practiceMakerInstance.userAnswers } : null;
      await this.applyMode();

      if (this.#practiceMakerInstance?.questions.length) {
        if (preservedAnswers) {
          this.#practiceMakerInstance.userAnswers = preservedAnswers;
        }
        const targetIndex = Math.min(currentIdx, this.#practiceMakerInstance.questions.length - 1);
        if (targetIndex >= 0) {
          this.#practiceMakerInstance.setQuestion(targetIndex);
        }
      }
      this.syncQuizSection();
    }
  
    /**
     * Initializes language selections, UI events, and loads question datasets.
     */
    async init() {
      const savedLang = localStorage.getItem(STORAGE_KEYS.LANG);
      if (savedLang) {
        this.#locale = savedLang;
        if (this.#dom.langSelect) {
          this.#dom.langSelect.value = savedLang;
        }
      }
  
      this.applyPageLocale(this.#locale);
      this.#setupModalEvents();
      this.#setupControlListeners();
      await this.loadDataAndRender();
    }
  }