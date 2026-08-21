/**
 * Build Questions from materials.
 * It will load questions markdown files (*.md) from questions folder.
 *
 * For Each Folders, It generats below file
 * 1. questions.json - JSON Array of all the questions in the folder
 * 2. questions-<<LANGUAGE_CODE>>.json - Localized JSON Array of all the questions in the folder.
 *    For the questions that doesn ot have language specific content, it uses the corresponding index from questions.json
 * 3. sub-questions.json - JSON Array of all the subfolders that have questions.json
 */
 import fs from 'node:fs';
 import path from 'node:path';
 import matter from 'gray-matter';
 import { glob } from 'glob';
 import chokidar from 'chokidar';
 import { validate } from 'jsonschema';

// === Configurable questions folder ===
const QUESTIONS_DIR = process.env.QUESTIONS_FOLDER
  ? path.resolve(process.env.QUESTIONS_FOLDER)
  : "questions";

// Configurable Public/Output folder
const PUBLIC_DIR = process.env.PUBLIC_FOLDER
  ? path.resolve(process.env.PUBLIC_FOLDER)
  : "dist";

// === Schema for validation ===
const schema = {
  type: "object",
  required: ["question", "type"],
  properties: {
    question: { type: "string" },
    explanation: { type: "string" },
    complexity: {
      type: "string",
      enum: ["M", "H"],
    },
    type: {
      type: "string",
      enum: ["CHOOSE_THE_BEST", "MULTI_CHOICE", "MATCH_THE_FOLLOWING"],
    },
    choices: {
      type: "array",
      // This ensures no two choice objects are exactly the same
      uniqueItems: true,
      minItems: 1,
      items: {
        type: "object",
        required: ["label"],
        properties: {
          label: { type: "string" },
          answer: { type: "boolean" },
        },
      },
    },
    matches: {
      type: "array",
      // This ensures no two choice objects are exactly the same
      uniqueItems: true,
      minItems: 1,
      items: {
        type: "object",
        required: ["label"],
        properties: {
          label: { type: "string" },
        },
      },
    },
  },
  additionalProperties: false,
};

function transformMarkdown(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  let questionRaw = content.trim();
  let explanationText;

  // 1. Extract Markdown Explanation if it exists in a code block
  const codeBlockMatch = questionRaw.match(/```markdown\s+([\s\S]*?)```/i);
  if (codeBlockMatch) {
    explanationText = codeBlockMatch[1].trim();
    questionRaw = questionRaw.split(/```markdown/i)[0].trim();
  }

/**
 * Helper to process standard $ and $$ delimiters.
 */
 const processKatex = (text) => {
  if (!text) return "";

  return (
    text
      /**
       * 1. Display Mode: $$ ... $$
       * The [^$] ensures we don't accidentally match inline math.
       * The 's' flag allows matching across multiple lines.
       */
      .replace(
        /\$\$(.*?)\$\$/gs,
        (match, formula) => `\n<div class="math-display">$$${formula}$$</div>\n`
      )

      /**
       * 2. Inline Mode: $ ... $
       * We use a lookbehind/lookahead logic to ensure we don't match 
       * empty dollar signs or double dollars.
       */
      .replace(
        /(?<!\$)\$([^$\n]+?)\$(?!\$)/g,
        (match, formula) => `$${formula.trim()}$`
      )
  );
};

  const question = {
    question: processKatex(questionRaw),
    explanation: explanationText
      ? processKatex(explanationText)
      : explanationText,
  };

  // Add complexity if it exists in the front matter data
  if (data.complexity) {
    question.complexity = data.complexity;
  }

  // 2. Handle Logic for Choices/Answers (Existing logic)
  const answers = Array.isArray(data.answers) ? data.answers : [];
  const initialChoices = Array.isArray(data.choices) ? data.choices : [];
  const combinedList = [...initialChoices, ...answers];

/**
 * Process Choices Value.
 * @param {*} choiceList
 * @returns
 */
 const processChoices = (choiceList) => {
  return choiceList.map((item) => {
    // 1. Force convert to string and aggressively trim edge whitespace
    let rawLabel = typeof item === "string" ? item.trim() : String(item);
    let imageUrl = null;

    // Remove wrapping quotes if the YAML parser passed them down as literal string chars
    if (rawLabel.startsWith('"') && rawLabel.endsWith('"')) {
      rawLabel = rawLabel.slice(1, -1).trim();
    }

    // 2. Perform the Markdown extraction
    if (typeof rawLabel === "string") {
      // Direct regex to pull text out of ![...] and (...) anywhere inside the line
      const imgMatch = rawLabel.match(/!\[(.*?)\]\((.*?)\)/);
      
      if (imgMatch) {
        rawLabel = imgMatch[1].trim(); // Extracts: Guided 2.
        imageUrl = imgMatch[2].trim(); // Extracts: /guru.jpeg
      }
    }

    // 3. Process KaTeX only AFTER the clean text label has been extracted
    const processedLabel = processKatex(rawLabel);

    const choice = { label: processedLabel };

    // 4. Attach the parsed image field
    if (imageUrl) {
      choice.image = imageUrl;
    }

    // 5. Check against the answers array using the pristine text label
    if (answers.includes(rawLabel)) {
      choice.answer = true;
    }

    return choice;
  });
};

  if (combinedList.length > 0) {
    question.choices = processChoices(combinedList);

    const correctCount = question.choices.filter((c) => c.answer).length;
    question.type = correctCount > 1 ? "MULTI_CHOICE" : "CHOOSE_THE_BEST";
  }

  const matches = Array.isArray(data.matches) ? data.matches : [];
  if (matches.length > 0) {
    question.matches = processChoices(matches);

    question.type = "MATCH_THE_FOLLOWING";
  }

  return question;
}

function autoFix(file, result, question) {
  console.log("Auto fixing "+ file);
  let fixAvailable = false;

  for (const err of result.errors) {
    if (err.message.indexOf("duplicate") != -1) {
      if (err.property === "instance.choices") {
        question.choices = removeDuplicates(question.choices);
      } 
      if (err.property === "instance.matches") {
        question.matches = removeDuplicates(question.matches);
      } 
      fixAvailable = true;
    } 
  }

  if(fixAvailable) {
    fixMarkdown(file, question);
  } else {
    throwError(file, result);
  }
}

/**
 * Creates Question Markdown File with separate Markdown Explanation block
 * @param {string} file - Path to the file
 * @param {object} question - The question object
 */
function fixMarkdown(file, question) {
  // 1. Separate choices into 'answers' and 'choices' (distractors)
  const answers = question.choices
    .filter((c) => c.answer === true)
    .map((c) => c.label);

  const distractors = question.choices
    .filter((c) => c.answer === false || !c.answer)
    .map((c) => c.label);

  // 1. Separate choices into 'answers' and 'choices' (distractors)
  const matches = question.matches ? question.matches.map((c) => c.label) : [];

  // 2. Prepare front-matter (Exclude explanation from here)
  const data = {
    choices: distractors,
    ...(answers && answers.length > 0 && { answers }),
    ...(matches && matches.length > 0 && { matches }),
  };

  // 3. Construct the body: Question + Explanation Code Block
  let contentBody = `\n${question.question.trim()}\n`;

  if (question.explanation && question.explanation.trim() !== "") {
    contentBody += `\n\`\`\`markdown\n${question.explanation.trim()}\n\`\`\`\n`;
  }

  // 4. Use gray-matter to stringify the YAML and the new body
  const output = matter.stringify(contentBody, data);

  // 5. Write to file
  fs.writeFileSync(file, output, "utf8");

  console.log(`Successfully wrote to: ${file}`);
}

function removeDuplicates(items) {
  // 1. Prioritize 'true' answers and clean up labels
  const cleanedChoices = items.map((c) => ({
    ...c,
    label: c.label.trim(), // Remove accidental trailing spaces
  }));

  const prioritized = cleanedChoices.sort((a, b) => {
    return (b.answer === true ? 1 : 0) - (a.answer === true ? 1 : 0);
  });

  // 2. Filter using findIndex
  const uniqueChoices = prioritized.filter((choice, index, self) => {
    // We check if the current index is the FIRST time this label appears
    const firstIndex = self.findIndex(
      (c) => c.label.toLowerCase() === choice.label.toLowerCase()
    );
    return index === firstIndex;
  });

  return uniqueChoices;
}

// IMPORTANT: You must reassign the variable!
// let myData = {...};
// myData = removeDuplicateChoices(myData);

function throwError(file, result) {
  console.error(`❌ Validation failed for: ${file}`);
  for (const err of result.errors) {
    console.error(`  → ${err.property}: ${err.message}`);
  }
  process.exit(1);
}

function buildAll() {
  const files = glob.sync("**/*.md", { cwd: QUESTIONS_DIR, absolute: true });
  const grouped = {};
  const locales = {};
  const pathMap = new Set();

  for (const file of files) {
    const rel = path.relative(QUESTIONS_DIR, file);
    const dir = path.dirname(rel);
    const base = path.basename(file, ".md");

    const match = base.match(/^([a-z0-9\-]+)(?:_([a-z]+))?$/);
    if (!match) {
      console.error(`❌ Invalid filename: ${file}`);
      process.exit(1);
    }

    const name = match[1];
    const locale = match[2] || "default";

    const question = transformMarkdown(file);
    const result = validate(question, schema);

    if (!result.valid) {
      const isAutoFixMode = process.argv.includes("--auto-fix");
      if (isAutoFixMode) {
        autoFix(file, result, question);
      } else {
        throwError(file, result);
      }
    }

    if (!grouped[dir]) grouped[dir] = {};
    if (!locales[dir]) locales[dir] = {};

    if (locale === "default") {
      grouped[dir][name] = question;
    } else {
      const basePath = path.join(QUESTIONS_DIR, dir, `${name}.md`);
      if (!fs.existsSync(basePath)) {
        console.error(`❌ Missing base file for localized: ${file}`);
        process.exit(1);
      }

      if (!locales[dir][locale]) locales[dir][locale] = {};
      locales[dir][locale][name] = question;
    }

    pathMap.add(dir.split(path.sep).join(path.posix.sep));
  }

  for (const dir in grouped) {
    // Replaced "dist" with PUBLIC_DIR
    const outDir = path.join(PUBLIC_DIR, "data", dir);
    fs.mkdirSync(outDir, { recursive: true });

    const questions = Object.keys(grouped[dir])
      .sort()
      .map((k) => grouped[dir][k]);

    fs.writeFileSync(
      path.join(outDir, "questions.json"),
      JSON.stringify(questions, null, 0)
    );
    console.log(`✅ Generated: ${path.join(outDir, "questions.json")}`);
  }

  for (const dir in locales) {
    for (const locale in locales[dir]) {
      const localized = [];
      const base = grouped[dir];
      const trans = locales[dir][locale];

      const names = Object.keys(base).sort();

      for (const name of names) {
        if (trans[name]) {
          const missing = Object.keys(base[name]).filter(
            (k) => !(k in trans[name])
          );
          if (missing.length > 0) {
            console.error(
              `❌ Missing fields in ${name}_${locale}.md: ${missing.join(", ")}`
            );
            process.exit(1);
          }
          localized.push(trans[name]);
        } else {
          localized.push(names.indexOf(name));
        }
      }

      // Replaced "dist" with PUBLIC_DIR
      const outDir = path.join(PUBLIC_DIR, "data", dir);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.join(outDir, `questions_${locale}.json`),
        JSON.stringify(localized, null, 0)
      );
      console.log(
        `✅ Generated: ${path.join(outDir, `questions_${locale}.json`)}`
      );
    }
  }

  // Generate Sub Questions.
  const subQMap = {};
  for (const dir of Object.keys(grouped)) {
    const tokens = dir.split(path.sep);
    if (tokens.length > 3) {
      const dirName = tokens[tokens.length - 1];
      // Replaced "dist" with PUBLIC_DIR
      const parentDir = path.join(
        PUBLIC_DIR,
        "data",
        dir.replace(path.sep + dirName, "")
      );
      if (parentDir in subQMap) {
        subQMap[parentDir].push(dirName);
      } else {
        subQMap[parentDir] = [dirName];
      }
    }
  }

  for (const dir of Object.keys(subQMap)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `sub-questions.json`),
      JSON.stringify(subQMap[dir], null, 0)
    );
    console.log(`✅ Generated: ${path.join(dir, `sub-questions.json`)}`);
  }
}

// === CLI flag check ===
const isWatchMode = process.argv.includes("--watch");

// === Watch mode setup ===
const startWatching = () => {
  chokidar
    .watch(QUESTIONS_DIR, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: true,
    })
    .on("all", (event, filePath) => {
      console.log(`📌 Detected ${event} in ${filePath}`);
      try {
        buildAll();
      } catch (err) {
        console.error("❌ Rebuild failed:", err);
      }
    });

  console.log(`👀 Watching for changes in: ${QUESTIONS_DIR}`);
};

// === Execution ===
buildAll();

if (isWatchMode) {
  startWatching();
}
