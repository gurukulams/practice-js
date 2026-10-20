/**
 * Questions Loader is responsible to load, filter and shuffle questions fom repository.
 * Sample Usage
 * const qL = new QuestionLoader();
 * qL.repoUrl = "";
 * qL.languageCode = 'ta'
 * qL.maxQuestions = 5;
 * qL.shuffle = true;
 * qL.tags = ["tag1","tag3"];
 *
 * const questionsarray = qL.loadQuestions();
 *
 * console.log(questionsarray);
 */
 export default class QuestionLoader {
  constructor() {
    this._repoUrl = null;
    this._languageCode = null;
    this._maxQuestions = null;
    this._shuffle = false;
    this._tags = false;
  }

  get tags() {
    return this._tags;
  }

  set tags(value) {
    this._tags = value;
    console.log(`tags set to: ${value}`);
  }

  get shuffleQuestions() {
    return this._shuffle;
  }

  set shuffleQuestions(value) {
    this._shuffle = Boolean(value);
  }

  get repoUrl() {
    return this._repoUrl;
  }

  set repoUrl(value) {
    this._repoUrl = value;
    console.log(`repoUrl set to: ${value}`);
  }

  get languageCode() {
    return this._languageCode;
  }

  set languageCode(value) {
    this._languageCode = value === "en" ? "" : value;
    console.log(`languageCode set to: ${this._languageCode}`);
  }

  get maxQuestions() {
    return this._maxQuestions;
  }

  set maxQuestions(value) {
    this._maxQuestions = value;
    console.log(`maxQuestions set to: ${value}`);
  }

  async loadQuestions() {
    const questions = await this.getQuestions(
      this._repoUrl,
      this._maxQuestions,
      this._languageCode
    );

    this.originalQuestions = JSON.parse(JSON.stringify(questions));

    console.log(questions);

    return questions;
  }
  async getQuestions() {
    const baseUrl = `${this._repoUrl}`;

    const fetchJSON = async (url) => {
      try {
        const res = await fetch(url);
        return res.ok ? await res.json() : null;
      } catch {
        return null;
      }
    };

    const resolveLocalized = (localized, fallback) => {
      return localized.map((q) => (typeof q === "number" ? fallback[q] : q));
    };

    const collectQuestions = async (folderUrl) => {
      const defaultQs = await fetchJSON(`${folderUrl}/questions.json`);
      if (!defaultQs) return [];

      const localizedQs = this._languageCode
        ? await fetchJSON(`${folderUrl}/questions_${this._languageCode}.json`)
        : null;

      const finalQs = localizedQs
        ? resolveLocalized(localizedQs, defaultQs)
        : defaultQs;

      return this.processQuestions(finalQs, folderUrl);
    };

    const loadFolderRecursively = async (folderUrl) => {
      const folderQuestions = [];

      // 1. Collect local questions if present
      const questions = await collectQuestions(folderUrl);
      if (questions?.length) {
        folderQuestions.push(...questions);
      }

      // 2. Fetch and traverse sub-questions index
      const subfolders = await fetchJSON(`${folderUrl}/sub-questions.json`);
      if (
        !subfolders ||
        !Array.isArray(subfolders) ||
        subfolders.length === 0
      ) {
        return folderQuestions;
      }

      // 3. Resolve subfolders using folderUrl
      const subFolderPromises = subfolders.map(async (sub) => {
        const cleanSubPath = sub.startsWith("/") ? sub.slice(1) : sub;
        const subUrl = `${folderUrl}/${cleanSubPath}`; // Fixed: uses folderUrl

        return await loadFolderRecursively(subUrl);
      });

      const nestedResults = await Promise.all(subFolderPromises);
      nestedResults.forEach((qList) => folderQuestions.push(...qList));

      return folderQuestions;
    };

    const allQuestions = await loadFolderRecursively(baseUrl);
    const questionsToReturn = this._shuffle
      ? this.shuffle(allQuestions)
      : allQuestions;

    return this._maxQuestions
      ? questionsToReturn.slice(0, this._maxQuestions)
      : questionsToReturn;
  }

  processQuestions(questions, folderUrl) {
    /**
     * Browser-safe URL joiner replacing path.posix.join
     */
    const joinUrl = (base, relative) => {
      const cleanBase = base.replace(/\/+$/, "");
      const cleanRel = relative.replace(/^\/+/, "");
      return `${cleanBase}/${cleanRel}`;
    };

    const appendFullPath = (folderUrl, question) => {
      const prefixUrl = (imgPath) => {
        if (imgPath.startsWith("http://") || imgPath.startsWith("https://")) {
          return imgPath;
        }
        return joinUrl(folderUrl, imgPath);
      };

      const prefixMarkdownImages = (text) => {
        if (!text) return text;
        return text.replace(
          /!\[(.*?)\]\((.*?)\)/g,
          (match, alt, imgUrl) => `![${alt}](${prefixUrl(imgUrl.trim())})`
        );
      };

      const updatedQuestion = JSON.parse(JSON.stringify(question));

      if (updatedQuestion.question) {
        updatedQuestion.question = prefixMarkdownImages(
          updatedQuestion.question
        );
      }

      if (updatedQuestion.explanation) {
        updatedQuestion.explanation = prefixMarkdownImages(
          updatedQuestion.explanation
        );
      }

      if (Array.isArray(updatedQuestion.choices)) {
        updatedQuestion.choices = updatedQuestion.choices.map((choice) => {
          if (choice.image) {
            choice.image = prefixUrl(choice.image);
          }
          return choice;
        });
      }

      if (Array.isArray(updatedQuestion.matches)) {
        updatedQuestion.matches = updatedQuestion.matches.map((match) => {
          if (match.image) {
            match.image = prefixUrl(match.image);
          }
          return match;
        });
      }

      return updatedQuestion;
    };
    const baseId = folderUrl.split("/data/")[1];
    return questions.map((rawQ, qIndex) => {
      const q = appendFullPath(folderUrl, rawQ);
      const questionId = `${baseId}-q${qIndex}`;
      const choices = (q.choices || []).map((c, i) => ({
        ...c,
        id: `${questionId}-c${i}`,
        questionId,
      }));
      const matches = (q.matches || []).map((m, i) => ({
        ...m,
        id: `${questionId}-m${i}`,
        questionId,
      }));
      return {
        ...q,
        id: questionId,
        choices: choices,
        matches: matches,
      };
    });
  }

  shuffle(array) {
    if (this._shuffle === false || !array || !Array.isArray(array)) {
      return array;
    }
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Filters a list of questions based on a target complexity level and selected tags,
   * and optionally caps the number of returned questions.
   *
   * @param {Array} questions - The list of question objects to filter.
   * @param {string|null} targetComplexity - The complexity level ("H", "M", or null).
   * @param {Array<string>} [selectedTags=[]] - List of tag strings that must all match.
   * @param {number|null} [maxQ=null] - Maximum number of questions to return.
   * @returns {Array} The filtered subset of questions.
   */
  filterQuestions(questions, targetComplexity, selectedTags = [], maxQ = null) {
    if (!questions || !Array.isArray(questions)) return [];

    const filtered = questions.filter((q) => {
      // 1. Complexity Filter
      let matchesComplexity = false;

      if (targetComplexity === "H") {
        // Include everything
        matchesComplexity = true;
      } else if (targetComplexity === "M") {
        // Include questions with NO complexity or "M"
        matchesComplexity = !q.complexity || q.complexity === "M";
      } else {
        // If targetComplexity is null/undefined: Include ONLY questions with NO complexity
        matchesComplexity = !q.complexity;
      }

      if (!matchesComplexity) return false;

      // 2. Tag Filter
      // If no tags are selected, skip tag filtering
      if (!selectedTags || selectedTags.length === 0) {
        return true;
      }

      // Ensure q.tags exists and is an array before filtering
      const questionTags = q.tags || [];

      // AND Logic: The question must contain ALL selected tags
      return selectedTags.every((tag) => questionTags.includes(tag));
    });

    // 3. Max Questions Cap
    const parsedMaxQ = Number(maxQ);
    if (Number.isInteger(parsedMaxQ) && parsedMaxQ > 0) {
      return filtered.slice(0, parsedMaxQ);
    }

    return filtered;
  }
}
