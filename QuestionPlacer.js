import fs from "fs";
import path from "path";
import readline from "readline";

const ROOT = path.resolve("questions");

const englishFile = process.argv[2];
const depthArg = process.argv[3] ?? "2";

if (!englishFile || process.argv.length > 4) {
  console.error("Usage: node QuestionPlacer.js <english-file.md> [depth]");
  process.exit(1);
}

if (!fs.existsSync(englishFile)) {
  console.error(`ERROR: File not found: ${englishFile}`);
  process.exit(1);
}

if (!/^\d+$/.test(depthArg)) {
  console.error("ERROR: Depth must be a non-negative integer.");
  process.exit(1);
}

const DEPTH = Number(depthArg);
const absoluteEnglishFile = path.resolve(englishFile);
const sourceTag = path.basename(absoluteEnglishFile, ".md");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function yamlList(items) {
  return items.map((item) => `  - ${JSON.stringify(item)}`).join("\n");
}

/*
 * Discover language files using this naming convention:
 *
 * 2021.md       -> English
 * 2021-ta.md    -> Tamil
 * 2021-hi.md    -> Hindi
 * 2021-te.md    -> Telugu
 */
function discoverLanguages() {
  const directory = path.dirname(absoluteEnglishFile);
  const files = fs.readdirSync(directory);

  const languages = {
    en: absoluteEnglishFile,
  };

  const prefix = `${sourceTag}-`;

  for (const file of files) {
    if (!file.startsWith(prefix) || !file.endsWith(".md")) {
      continue;
    }

    const language = file.slice(prefix.length, -3);

    if (language) {
      languages[language] = path.join(directory, file);
    }
  }

  return Object.fromEntries(
    Object.entries(languages).sort(([a], [b]) => {
      if (a === "en") return -1;
      if (b === "en") return 1;
      return a.localeCompare(b);
    })
  );
}

/*
 * Parse questions and their bullet options.
 *
 * A new question starts when a non-option line appears
 * after the previous question's options.
 */
function readQuestions(file) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);

  const questions = [];
  let questionLines = [];
  let options = [];
  let readingOptions = false;

  const optionPattern = /^\s*(?:[-*+]\s+|\d+[.)]\s+|[A-Za-z][.)]\s+)/;

  function saveQuestion() {
    const question = questionLines.join("\n").trim();

    if (question) {
      questions.push({
        question,
        options: [...options],
      });
    }

    questionLines = [];
    options = [];
    readingOptions = false;
  }

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    if (optionPattern.test(line)) {
      readingOptions = true;
      options.push(line.replace(optionPattern, "").trim());
      continue;
    }

    if (readingOptions) {
      saveQuestion();
    }

    questionLines.push(line.trim());
  }

  saveQuestion();

  return questions;
}

/*
 * Find directories at the requested depth or deeper.
 *
 * questions/                              depth 0
 * questions/science/                      depth 1
 * questions/science/physics/              depth 2
 * questions/science/physics/wave-optics/  depth 3
 */
function getFolders() {
  if (!fs.existsSync(ROOT)) {
    throw new Error(`Folder not found: ${ROOT}`);
  }

  const folders = [];

  function walk(directory, currentDepth) {
    if (currentDepth >= DEPTH) {
      folders.push(directory);
    }

    const entries = fs.readdirSync(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      walk(
        path.join(directory, entry.name),
        currentDepth + 1
      );
    }
  }

  walk(ROOT, 0);

  return folders.sort();
}

async function chooseFolder(folders) {
  console.log("\nAvailable folders:");

  folders.forEach((folder, index) => {
    console.log(
      `${String(index + 1).padStart(3, " ")}. ${path.relative(process.cwd(), folder)}`
    );
  });

  while (true) {
    const answer = await ask("\nChoose folder number: ");
    const index = Number(answer) - 1;

    if (
      Number.isInteger(index) &&
      index >= 0 &&
      index < folders.length
    ) {
      return folders[index];
    }

    console.log("Invalid selection. Try again.");
  }
}

async function chooseQuestionType() {
  console.log("\nQuestion type:");
  console.log("1. Choose the Best");
  console.log("2. Multiple Choice");
  console.log("3. Match the Following");

  while (true) {
    const answer = await ask("Choose type (1/2/3): ");

    if (["1", "2", "3"].includes(answer)) {
      return Number(answer);
    }

    console.log("Invalid selection. Try again.");
  }
}

async function chooseAnswerIndexes(options, allowMultiple) {
  console.log("\nOptions:");

  options.forEach((option, index) => {
    console.log(`  ${index + 1}. ${option}`);
  });

  while (true) {
    const prompt = allowMultiple
      ? "\nEnter correct option numbers separated by commas: "
      : "\nEnter correct option number: ";

    const answer = await ask(prompt);

    const indexes = answer
      .split(",")
      .map((value) => Number(value.trim()) - 1);

    const valid =
      indexes.length > 0 &&
      indexes.every(
        (index) =>
          Number.isInteger(index) &&
          index >= 0 &&
          index < options.length
      ) &&
      new Set(indexes).size === indexes.length;

    if (valid && (allowMultiple || indexes.length === 1)) {
      return indexes;
    }

    console.log("Invalid selection. Try again.");
  }
}

async function enterMatches(questionOptions, language) {
  console.log(`\nEnter matching targets for ${language}:`);

  const matches = [];

  for (let i = 0; i < questionOptions.length; i++) {
    console.log(`  ${i + 1}. ${questionOptions[i]}`);

    const match = await ask("     Matches with: ");

    if (!match) {
      throw new Error("A matching target cannot be empty.");
    }

    matches.push(match);
  }

  return matches;
}

function buildFrontmatter(question, type, answerIndexes, matches) {
  let frontmatter = `---\ntags:\n${yamlList([sourceTag])}\n`;

  if (type === 1) {
    const choices = question.options.filter(
      (_, index) => !answerIndexes.includes(index)
    );

    const answers = answerIndexes.map(
      (index) => question.options[index]
    );

    frontmatter += `choices:\n${yamlList(choices)}\n`;
    frontmatter += `answers:\n${yamlList(answers)}\n`;
  }

  if (type === 2) {
    const answers = answerIndexes.map(
      (index) => question.options[index]
    );

    frontmatter += `choices:\n${yamlList(question.options)}\n`;
    frontmatter += `answers:\n${yamlList(answers)}\n`;
  }

  if (type === 3) {
    frontmatter += `choices:\n${yamlList(question.options)}\n`;
    frontmatter += `matches:\n${yamlList(matches)}\n`;
  }

  frontmatter += "---\n\n";

  return frontmatter;
}

function outputFileName(questionNumber, language) {
  const number = String(questionNumber).padStart(3, "0");

  return language === "en"
    ? `q${number}.md`
    : `q${number}-${language}.md`;
}

async function main() {
  const languages = discoverLanguages();

  console.log("\nSource files:");

  for (const [language, file] of Object.entries(languages)) {
    console.log(`  ${language}: ${path.basename(file)}`);
  }

  const allQuestions = {};

  for (const [language, file] of Object.entries(languages)) {
    allQuestions[language] = readQuestions(file);
  }

  const englishQuestions = allQuestions.en;

  if (!englishQuestions || englishQuestions.length === 0) {
    throw new Error("No questions found in the English source file.");
  }

  for (const [language, questions] of Object.entries(allQuestions)) {
    if (questions.length !== englishQuestions.length) {
      throw new Error(
        `Question count mismatch: ${language} has ${questions.length}, ` +
        `English has ${englishQuestions.length}.`
      );
    }

    for (let i = 0; i < questions.length; i++) {
      if (
        questions[i].options.length !==
        englishQuestions[i].options.length
      ) {
        throw new Error(
          `Option count mismatch in question ${i + 1} (${language}).`
        );
      }
    }
  }

  const folders = getFolders();

  if (folders.length === 0) {
    throw new Error(
      `No folders found at depth ${DEPTH} or deeper under questions/.`
    );
  }

  console.log(`\nFound ${englishQuestions.length} questions.`);
  console.log(`Folder depth: ${DEPTH}`);
  console.log(`Languages: ${Object.keys(languages).join(", ")}`);

  for (let i = 0; i < englishQuestions.length; i++) {
    const questionNumber = i + 1;
    const englishQuestion = englishQuestions[i];

    console.log("\n========================================");
    console.log(`Question ${questionNumber}`);
    console.log("========================================");

    console.log(`\n${englishQuestion.question}`);

    englishQuestion.options.forEach((option, index) => {
      console.log(`  ${index + 1}. ${option}`);
    });

    const folder = await chooseFolder(folders);
    const type = await chooseQuestionType();

    let answerIndexes = [];
    let matchesByLanguage = {};

    if (type === 1 || type === 2) {
      answerIndexes = await chooseAnswerIndexes(
        englishQuestion.options,
        type === 2
      );
    }

    if (type === 3) {
      for (const language of Object.keys(languages)) {
        const question = allQuestions[language][i];

        console.log(`\n${language.toUpperCase()} question:`);
        console.log(question.question);

        matchesByLanguage[language] = await enterMatches(
          question.options,
          language
        );
      }
    }

    fs.mkdirSync(folder, { recursive: true });

    for (const [language, questions] of Object.entries(allQuestions)) {
      const question = questions[i];

      const frontmatter = buildFrontmatter(
        question,
        type,
        answerIndexes,
        matchesByLanguage[language] ?? []
      );

      const output = frontmatter + question.question + "\n";

      const fileName = outputFileName(questionNumber, language);
      const outputPath = path.join(folder, fileName);

      if (fs.existsSync(outputPath)) {
        const overwrite = await ask(
          `\n${outputPath} already exists. Overwrite? (y/N): `
        );

        if (overwrite.toLowerCase() !== "y") {
          console.log(`Skipped: ${outputPath}`);
          continue;
        }
      }

      fs.writeFileSync(outputPath, output, "utf8");

      console.log(`Created: ${outputPath}`);
    }
  }

  console.log("\nAll questions processed.");
}

main()
  .catch((error) => {
    console.error(`\nERROR: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });
