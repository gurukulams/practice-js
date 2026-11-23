#!/usr/bin/env node
/**
 * HeSplitter.js
 *
 * Splits every .md file in a folder by its H2 (##) headings.
 * For each H2, a sub-folder named after the heading is created, and the
 * content under that heading is written into it using the original file name.
 *
 * Example: 2020.md containing "## 1 Marks / C1" and "## 2 Marks / C2" gives:
 *   <folder>/1 Marks/2020.md   (content: C1)
 *   <folder>/2 Marks/2020.md   (content: C2)
 *
 * Usage:
 *   node HeSplitter.js <PATH_OF_THE_FOLDER> [--slug] [--dry-run]
 *
 *   --slug     name sub-folders like "1-marks" instead of "1 Marks"
 *   --dry-run  show what would be written without writing anything
 */
 import fs from "node:fs";
 import path from "node:path";
 
 const args = process.argv.slice(2);
 const flags = new Set(args.filter((a) => a.startsWith("--")));
 const positional = args.filter((a) => !a.startsWith("--"));
 
 const useSlug = flags.has("--slug");
 const dryRun = flags.has("--dry-run");
 
 if (positional.length !== 1) {
   console.error("Usage: node HeSplitter.js <PATH_OF_THE_FOLDER> [--slug] [--dry-run]");
   process.exit(1);
 }
 
 const rootDir = path.resolve(positional[0]);
 
 if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
   console.error(`❌ Not a directory: ${rootDir}`);
   process.exit(1);
 }
 
 /** Turns a heading into a safe folder name. */
 function toFolderName(heading) {
   if (useSlug) {
     return heading
       .toLowerCase()
       .replace(/[^a-z0-9]+/g, "-")
       .replace(/^-+|-+$/g, "");
   }
   return heading
     .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "") // characters not allowed in file names
     .replace(/\s+/g, " ")
     .replace(/[. ]+$/, "") // Windows does not allow trailing dots or spaces
     .trim();
 }
 
 /**
  * Splits markdown text into [{ heading, content }] by H2 headings.
  * Lines inside fenced code blocks are never treated as headings.
  * Anything before the first H2 (title, front matter, intro) is ignored.
  */
 function splitByH2(text) {
   const lines = text.split(/\r?\n/);
   const sections = [];
   let current = null;
   let fence = null; // the fence marker currently open, if any
 
   for (const line of lines) {
     const fenceMatch = line.match(/^\s*(```|~~~)/);
     if (fenceMatch) {
       if (!fence) fence = fenceMatch[1];
       else if (fence === fenceMatch[1]) fence = null;
     }
 
     const h2 = !fence && line.match(/^##(?!#)\s+(.*\S)\s*$/);
     if (h2) {
       current = { heading: h2[1].replace(/\s+#+$/, "").trim(), lines: [] };
       sections.push(current);
     } else if (current) {
       current.lines.push(line);
     }
   }
 
   return sections.map((s) => ({
     heading: s.heading,
     content: s.lines.join("\n").trim(),
   }));
 }
 
 const mdFiles = fs
   .readdirSync(rootDir, { withFileTypes: true })
   .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md"))
   .map((e) => e.name);
 
 if (mdFiles.length === 0) {
   console.warn(`⚠️ No .md files found in ${rootDir}`);
   process.exit(0);
 }
 
 let written = 0;
 
 for (const fileName of mdFiles) {
   const filePath = path.join(rootDir, fileName);
   const sections = splitByH2(fs.readFileSync(filePath, "utf8"));
 
   if (sections.length === 0) {
     console.warn(`⚠️ Skipped (no ## headings): ${fileName}`);
     continue;
   }
 
   // If the same heading appears twice in one file, its contents are merged.
   const merged = new Map();
   for (const { heading, content } of sections) {
     const folder = toFolderName(heading);
     if (!folder) {
       console.warn(`⚠️ ${fileName}: heading "${heading}" gives an empty folder name, skipped`);
       continue;
     }
     merged.set(folder, merged.has(folder) ? `${merged.get(folder)}\n\n${content}` : content);
   }
 
   for (const [folder, content] of merged) {
     const outDir = path.join(rootDir, folder);
     const outFile = path.join(outDir, fileName);
 
     if (dryRun) {
       console.log(`[dry-run] ${path.relative(rootDir, outFile)}`);
     } else {
       fs.mkdirSync(outDir, { recursive: true });
       fs.writeFileSync(outFile, content + "\n", "utf8");
       console.log(`✅ ${path.relative(rootDir, outFile)}`);
     }
     written++;
   }
 }
 
 console.log(`\nDone. ${written} file(s) ${dryRun ? "would be " : ""}written.`);