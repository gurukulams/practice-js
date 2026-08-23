export default class QuestionLoader {
  constructor() {
    this._repoUrl = null;
    this._languageCode = null;
    this._maxQuestions = null;
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
    this._languageCode = value;
    console.log(`languageCode set to: ${value}`);
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
    const allQuestions = [];

    const fetchJSON = async (url) => {
      try {
        const res = await fetch(url);
        return res.ok ? await res.json() : null;
      } catch {
        return null;
      }
    };

    const resolveLocalized = (localized, fallback) => {
      return localized.map((q, i) => (typeof q === "number" ? fallback[q] : q));
    };

    const collectQuestions = async (folderUrl) => {
      const defaultQs = (await fetchJSON(`${folderUrl}/questions.json`)) || [];
      const localizedQs = this._languageCode
        ? await fetchJSON(`${folderUrl}/questions_${this._languageCode}.json`)
        : null;

      const finalQs = localizedQs
        ? resolveLocalized(localizedQs, defaultQs)
        : defaultQs;

      return this.assignIds(finalQs, folderUrl.split("/data/")[1]);
    };

    // === Load main category questions ===
    allQuestions.push(...(await collectQuestions(baseUrl)));

    // === Load subfolders recursively ===
    const subfolders = await fetchJSON(`${baseUrl}/sub-questions.json`);
    if (subfolders?.length) {
      const fetches = subfolders.map(async (sub) => {
        const subPath = `/${sub}`;
        const subUrl = `${questionsUrl}/${subPath}`;
        console.log("Sub Url " + subUrl);
        const subQs = await collectQuestions(subUrl);
        allQuestions.push(...subQs);
      });
      await Promise.all(fetches);
    }

    const shuffled = this.shuffle(allQuestions);
    return this._maxQuestions ? shuffled.slice(0, this._maxQuestions) : shuffled;
  }

  assignIds(questions, baseId) {
    return questions.map((q, qIndex) => {
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
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// // Example usage
// const loader = new QuestionLoader();

// loader.repoUrl = "http://localhost:3000/data/com/example";
// const questions = await loader.loadQuestions();
// console.log(questions);
// // loader.languageCode = "en";
