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

const IMAGE_EXTENSIONS = new Set(['.jpeg', '.jpg', '.png', '.svg']);  

// Filename validation: Allows lowercase letters, numbers, hyphens, and underscores
const VALID_FILENAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*(_[a-z]{2})?$/;

function copyImages(srcDir = QUESTIONS_DIR, destDir = path.join(PUBLIC_DIR, 'data')) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`Source folder does not exist: ${srcDir}`);
    return;
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      // Validate subfolder names against the rule
      if (!VALID_FILENAME_REGEX.test(entry.name)) {
        console.error(`❌ Invalid folder name: ${entry.name} in ${srcDir}`);
        process.exit(1);
      }
      
      // Recursively process valid subdirectories
      copyImages(srcPath, destPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      
      if (IMAGE_EXTENSIONS.has(ext)) {
        // Extract base filename without extension
        const baseName = path.basename(entry.name, ext);

        // Validate image base filename
        if (!VALID_FILENAME_REGEX.test(baseName)) {          
          console.error(`❌ Invalid image filename: ${entry.name} in ${srcDir}`);
          process.exit(1);
        }

        // Ensure destination directory exists before copying
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${srcPath} -> ${destPath}`);
      }
    }
  }
}

// === Schema for validation ===
const schema = {
  type: "object",
  required: ["question", "type"],
  properties: {
    question: { type: "string" },
    explanation: { type: "string" },
    tags: {
      type: "array",
      description: "List of tags associated with the question, supporting Markdown strings.",
      items: {
        type: "string"
      },
      uniqueItems: true
    },
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

  const fileDir = path.dirname(filePath);

  // Extract optional language suffix from the markdown file name (e.g., "multi-choice_ta.md" -> "ta")
  const mdFileName = path.basename(filePath, ".md");
  const langMatch = mdFileName.match(/_([a-z]{2})$/i);
  const langSuffix = langMatch ? langMatch[1] : null;

  /**
   * Resolves the target image path.
   * If a language suffix exists, checks for `image_lang.ext` first.
   * If missing, falls back to standard `image.ext`.
   * Throws an error if neither exists.
   */
  const resolveAndValidateImage = (imgUrl) => {
    const rawPath = imgUrl.replace(/^\//, "");
    const ext = path.extname(rawPath);
    const baseName = path.basename(rawPath, ext);

    // 1. Try language-specific version if current file has a language code
    if (langSuffix) {
      // Avoid duplicating language suffix if it's already in the image string
      const langBaseName = baseName.endsWith(`_${langSuffix}`)
        ? baseName
        : `${baseName}_${langSuffix}`;
      
      const langImgPath = `${langBaseName}${ext}`;
      const fullLangPath = path.resolve(fileDir, langImgPath);

      if (fs.existsSync(fullLangPath)) {
        return langImgPath; // Use the localized image
      }
    }

    // 2. Fall back to standard default image path
    const fullDefaultPath = path.resolve(fileDir, rawPath);
    if (fs.existsSync(fullDefaultPath)) {
      return rawPath;
    }

    // 3. Error out if neither exists
    console.error(
      `❌ Image resolution error in file: ${filePath}\n` +
      `   Referenced image "${imgUrl}" (or localized variant) does not exist in: ${fileDir}`
    );
    process.exit(1);
  };

  /**
   * Scans markdown text body for images, validates, and replaces with resolved paths.
   */
  const processImagesInText = (text) => {
    if (!text) return "";
    return text.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, imgUrl) => {
      const resolvedPath = resolveAndValidateImage(imgUrl.trim());
      return `![${alt}](${resolvedPath})`;
    });
  };

  // Process and validate images inside the main content body
  const processedContent = processImagesInText(content);

  let questionRaw = processedContent.trim();
  let explanationText;

  // Extract Markdown Explanation if it exists in a code block
  const codeBlockMatch = questionRaw.match(/```markdown\s+([\s\S]*?)```/i);
  if (codeBlockMatch) {
    explanationText = codeBlockMatch[1].trim();
    questionRaw = questionRaw.split(/```markdown/i)[0].trim();
  }

  const processKatex = (text) => {
    if (!text) return "";
    return text
      .replace(
        /\$\$(.*?)\$\$/gs,
        (match, formula) => `\n<div class="math-display">$$${formula}$$</div>\n`
      )
      .replace(
        /(?<!\$)\$([^$\n]+?)\$(?!\$)/g,
        (match, formula) => `$${formula.trim()}$`
      );
  };

  const question = {
    question: processKatex(questionRaw),
    explanation: explanationText
      ? processKatex(explanationText)
      : explanationText,
  };

  if (Array.isArray(data.tags)) {
    question.tags = data.tags.map((tag) => tag.trim());
  }

  if (data.complexity) {
    question.complexity = data.complexity;
  }

  const answers = Array.isArray(data.answers) ? data.answers : [];
  const initialChoices = Array.isArray(data.choices) ? data.choices : [];
  const combinedList = [...initialChoices, ...answers];

  const processChoices = (choiceList) => {
    return choiceList.map((item) => {
      let rawLabel = typeof item === "string" ? item.trim() : String(item);
      let imageUrl = null;

      if (rawLabel.startsWith('"') && rawLabel.endsWith('"')) {
        rawLabel = rawLabel.slice(1, -1).trim();
      }

      if (typeof rawLabel === "string") {
        const imgMatch = rawLabel.match(/!\[(.*?)\]\((.*?)\)/);

        if (imgMatch) {
          rawLabel = imgMatch[1].trim();
          
          // Resolve and assign localized image path if available
          imageUrl = resolveAndValidateImage(imgMatch[2].trim());
        }
      }

      const processedLabel = processKatex(rawLabel);
      const choice = { label: processedLabel };

      if (imageUrl) {
        choice.image = imageUrl;
      }

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

  // Extract tags, format strings/objects, and remove duplicates using Set
  const rawTags = question.tags && Array.isArray(question.tags)
    ? question.tags.map((t) => (typeof t === "object" ? t.label || t.name : t))
    : [];

  const tags = [...new Set(rawTags.map((tag) => tag.toString().trim()))].filter(Boolean);

  // 2. Prepare front-matter (Exclude explanation from here)
  const data = {
    choices: distractors,
    ...(answers && answers.length > 0 && { answers }),
    ...(matches && matches.length > 0 && { matches }),
    ...(tags && tags.length > 0 && { tags }),
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
  copyImages();
  const files = glob.sync("**/*.md", { cwd: QUESTIONS_DIR, absolute: true });
  const grouped = {};
  const locales = {};
  const pathMap = new Set();

  for (const file of files) {
    const rel = path.relative(QUESTIONS_DIR, file);
    const dir = path.dirname(rel);
    const base = path.basename(file, ".md");

    // Trailing "_<letters>" is a locale suffix (e.g. "1_ta", "question_07_ta").
    // The base name itself may contain digits/underscores (e.g. "question_07"),
    // so only strip the suffix when it parses as letters-only.
    const localeSplit = base.match(/^(.+)_([a-z]+)$/);
    const name = localeSplit ? localeSplit[1] : base;
    const locale = localeSplit ? localeSplit[2] : "default";

    // Usage example:
    if (!VALID_FILENAME_REGEX.test(name)) {
      console.error(`❌ Invalid filename: ${file}`);
      process.exit(1);
    }

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
