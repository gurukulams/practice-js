class QuestionLoader {
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
    this._languageCode = (value === 'en') ? '' : value;
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
      if (!subfolders || !Array.isArray(subfolders) || subfolders.length === 0) {
        return folderQuestions;
      }
  
      // 3. Resolve subfolders using folderUrl
      const subFolderPromises = subfolders.map(async (sub) => {
        const cleanSubPath = sub.startsWith('/') ? sub.slice(1) : sub;
        const subUrl = `${folderUrl}/${cleanSubPath}`; // Fixed: uses folderUrl
  
        return await loadFolderRecursively(subUrl);
      });
  
      const nestedResults = await Promise.all(subFolderPromises);
      nestedResults.forEach((qList) => folderQuestions.push(...qList));
  
      return folderQuestions;
    };
  
    const allQuestions = await loadFolderRecursively(baseUrl);
    const shuffled = this.shuffle(allQuestions);
  
    return this._maxQuestions
      ? shuffled.slice(0, this._maxQuestions)
      : shuffled;
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
    updatedQuestion.question = prefixMarkdownImages(updatedQuestion.question);
  }

  if (updatedQuestion.explanation) {
    updatedQuestion.explanation = prefixMarkdownImages(updatedQuestion.explanation);
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

export { QuestionLoader as default };
//# sourceMappingURL=q-loader.esm.js.map
