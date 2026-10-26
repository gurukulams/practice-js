import {
  loadUserQuestions,
  saveUserQuestion,
  deleteUserQuestion,
} from "../storage";

const remoteQuestionsCache = new Map();

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
  constructor(options = {}) {
    this._repoUrl = options.repoUrl || null;
    this._languageCode =
      options.languageCode === "en" ? "" : options.languageCode || null;
    this._maxQuestions = options.maxQuestions ?? options.maxQ ?? null;
    this._shuffle = Boolean(options.shuffleQuestions ?? options.shuffle);
    this._tags = options.tags || [];
    this._complexity = options.complexity ?? null;
    this._source = options.source || "all";
    this._includeUserQuestions = Boolean(options.includeUserQuestions);
    this._questions = options.questions || null;
  }

  get tags() {
    return this._tags;
  }

  set tags(value) {
    this._tags = value;
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

  async loadSourceQuestions() {
    const questions = this._questions !== null
      ? this._questions
      : this._repoUrl
        ? await this.getQuestions()
        : [];
    const allQuestions = this._includeUserQuestions
      ? [...questions, ...loadUserQuestions().map((question) => ({
          ...question,
          _source: "user",
        }))]
      : questions;
    this.originalQuestions = JSON.parse(JSON.stringify(allQuestions));
    return allQuestions;
  }

  setQuestions(questions) {
    if (!Array.isArray(questions)) {
      throw new TypeError("Questions must be an array.");
    }
    this._questions = questions;
  }

  async loadQuestions(options = {}) {
    return this.#filterQuestions(
      await this.loadSourceQuestions(),
      options
    );
  }


async getQuestions() {
  const baseUrl = this._repoUrl.replace(/\/+$/, "");
  const cacheKey = `${baseUrl}\0${this._languageCode || ""}`;

  if (remoteQuestionsCache.has(cacheKey)) {
      return structuredClone(remoteQuestionsCache.get(cacheKey));
  }

  const fetchJSON = async (url) => {
      const response = await fetch(url);

      if (response.status === 404) return null;

      if (!response.ok) {
          throw new Error(
              `Failed to load questions (${response.status}): ${url}`
          );
      }

      return response.json();
  };

  /**
   * Resolve localized questions.
   *
   * A numeric entry refers to the corresponding question
   * in the default questions.json file.
   */
  const resolveLocalized = (localized, fallback) => {
      return localized.map(q =>
          typeof q === "number" ? fallback[q] : q
      );
  };

  /**
   * Load questions from a single folder.
   */
  const collectQuestions = async (folderUrl) => {
      const defaultQs = await fetchJSON(
          `${folderUrl}/questions.json`
      );

      if (!defaultQs) return [];

      const localizedQs = this._languageCode
          ? await fetchJSON(
              `${folderUrl}/questions_${this._languageCode}.json`
          )
          : null;

      const finalQs = localizedQs
          ? resolveLocalized(localizedQs, defaultQs)
          : defaultQs;

      return this.processQuestions(finalQs, folderUrl);
  };

  /**
   * Find the subtree corresponding to repoUrl.
   *
   * Example:
   * repoUrl = /data/social-science/history
   *
   * q-map.json contains:
   * {
   *   "social-science": {
   *     "history": {
   *       "world-war-ii": {}
   *     }
   *   }
   * }
   */
   const normalizedUrl = baseUrl.replace(/\/+$/, "");

   const match = normalizedUrl.match(/^(.*?)(?:^|\/)data(?:\/(.*))?$/);
   
   if (!match) {
       throw new Error(
           `Invalid repoUrl: ${baseUrl}. Expected a path containing data.`
       );
   }
   
   const prefix = match[1].replace(/\/$/, "");
   
   const dataRootUrl = prefix
       ? `${prefix}/data`
       : normalizedUrl.startsWith("/")
           ? "/data"
           : "data";
   
   const relativePath = match[2] || "";

  // Fetch the map from the root data folder.
  const questionMap = await fetchJSON(
      `${dataRootUrl}/q-map.json`
  );

  if (!questionMap) {
      throw new Error(
          `Question map not found: ${dataRootUrl}/q-map.json`
      );
  }

  // Navigate to the requested subtree.
  const segments = relativePath
      .split("/")
      .filter(Boolean);

  let subtree = questionMap;

  for (const segment of segments) {
      if (
          !subtree ||
          !Object.prototype.hasOwnProperty.call(subtree, segment)
      ) {
          // Requested folder is not present in the map.
          return [];
      }

      subtree = subtree[segment];
  }

  /**
   * Collect all question folder URLs from the subtree.
   *
   * Leaf folders are included because the map generator
   * guarantees that they contain questions.json.
   *
   * Parent folders are also included because they may
   * contain their own questions.json.
   */
  const folderUrls = [];

  const collectFolders = (node, folderUrl) => {
      folderUrls.push(folderUrl);

      for (const [name, children] of Object.entries(node)) {
          collectFolders(
              children,
              `${folderUrl}/${encodeURIComponent(name)}`
          );
      }
  };

  collectFolders(subtree, baseUrl);

  /**
   * Load questions from all folders in parallel.
   *
   * Missing questions.json files return an empty array.
   */
  const results = await Promise.all(
      folderUrls.map(folderUrl =>
          collectQuestions(folderUrl)
      )
  );

  const questions = results.flat();

  remoteQuestionsCache.set(cacheKey, questions);

  return structuredClone(questions);
}


  #filterQuestions(
    questions,
    options = {}
  ) {
    if (!Array.isArray(questions)) return [];

    if (options === null || typeof options !== "object") {
      throw new TypeError("Question filter options must be an object.");
    }
    const {
      complexity = this._complexity,
      tags = this._tags,
      maxQuestions: limit = this._maxQuestions,
      source = this._source,
      shuffle = this._shuffle,
    } = options;

    let filtered = questions.filter((question) => {
      if (source === "user" && question._source !== "user") return false;

      if (complexity === "H") {
        // High includes all complexity levels.
      } else if (complexity === "M") {
        if (question.complexity && question.complexity !== "M") return false;
      } else if (question.complexity) {
        return false;
      }

      return !tags?.length || tags.every((tag) => question.tags?.includes(tag));
    });

    const parsedLimit = Number(limit);
    if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
      filtered = filtered.slice(0, parsedLimit);
    }

    return this.shuffle(filtered, shuffle);
  }

  saveUserQuestion(question) {
    saveUserQuestion(question);
  }

  deleteUserQuestion(id) {
    deleteUserQuestion(id);
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

  shuffle(array, enabled = this._shuffle) {
    if (!enabled || !array || !Array.isArray(array)) {
      return array;
    }
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

}
