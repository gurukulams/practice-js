import fs from 'node:fs';
import path from 'node:path';

const IMAGE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif",
  ".svg", ".webp", ".bmp", ".avif"
]);

const SKIP_DIRS = new Set([
  ".git", "node_modules"
]);

const root = path.resolve(process.argv[2] || ".");
const shouldDelete = process.argv.includes("--delete");

if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`Invalid directory: ${root}`);
  process.exit(1);
}

const markdownFiles = [];
const imageFiles = [];

function scan(dir) {
  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true
  })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        scan(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();

      if (ext === ".md") {
        markdownFiles.push(fullPath);
      } else if (IMAGE_EXTENSIONS.has(ext)) {
        imageFiles.push(fullPath);
      }
    }
  }
}

function normalize(value) {
  let result = value;

  try {
    result = decodeURIComponent(result);
  } catch {
    // Keep original if decoding fails
  }

  return result
    .replace(/\\/g, "/")
    .replace(/[?#].*$/, "")
    .replace(/^\.\//, "")
    .toLowerCase();
}

function isReferenced(image, markdown, content) {
  const relativeToMd = normalize(
    path.relative(path.dirname(markdown), image)
  );

  const relativeToRoot = normalize(
    path.relative(root, image)
  );

  const filename = normalize(path.basename(image));
  const text = normalize(content);

  // Check relative and root-based paths
  if (text.includes(relativeToMd)) return true;
  if (text.includes(relativeToRoot)) return true;

  // Conservative fallback for filename-only references.
  // Avoid deleting images referenced through custom
  // shortcodes, front matter, or site-specific syntax.
  if (text.includes(filename)) return true;

  return false;
}

function main() {
  console.log(`Scanning: ${root}\n`);

  scan(root);

  const markdownContents = markdownFiles.map(file => ({
    file,
    content: fs.readFileSync(file, "utf8")
  }));

  const unused = imageFiles.filter(image =>
    !markdownContents.some(({ file, content }) =>
      isReferenced(image, file, content)
    )
  );

  console.log(`Markdown files : ${markdownFiles.length}`);
  console.log(`Image files    : ${imageFiles.length}`);
  console.log(`Unused images  : ${unused.length}\n`);

  let deleted = 0;
  let failed = 0;

  for (const image of unused) {
    const relative = path.relative(root, image);

    if (shouldDelete) {
      try {
        fs.unlinkSync(image);
        console.log(`DELETED: ${relative}`);
        deleted++;
      } catch (error) {
        console.error(`FAILED: ${relative} - ${error.message}`);
        failed++;
      }
    } else {
      console.log(`UNUSED: ${relative}`);
    }
  }

  console.log("\nSummary");
  console.log("------------------------");

  if (shouldDelete) {
    console.log(`Deleted: ${deleted}`);
    console.log(`Failed : ${failed}`);
  } else {
    console.log("Dry run: No files deleted.");
    console.log("Use --delete to remove unused images.");
  }
}

main();
