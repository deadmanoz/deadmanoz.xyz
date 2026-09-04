/**
 * Check (or rewrite) `_posts` markdown for one-sentence-per-line layout.
 *
 *   just check-prose
 *   just check-prose _posts/2026/invalid-blocks.md
 *   just fix-prose
 *   just fix-prose _posts/2026/invalid-blocks.md
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  checkMarkdown,
  formatMarkdown,
  formatReport,
  type SentencePerLineReport,
} from "../src/lib/sentence-per-line";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const defaultPostsDir = path.join(projectRoot, "_posts");

function collectMarkdownFiles(target: string): string[] {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    return target.endsWith(".md") ? [target] : [];
  }
  const entries = fs.readdirSync(target, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function resolveTargets(args: string[]): string[] {
  if (args.length === 0) {
    return collectMarkdownFiles(defaultPostsDir);
  }
  return args.flatMap((arg) => {
    const resolved = path.resolve(arg);
    if (!fs.existsSync(resolved)) {
      throw new Error(`No such file or directory: ${arg}`);
    }
    return collectMarkdownFiles(resolved);
  });
}

function relativePath(filePath: string): string {
  return path.relative(projectRoot, filePath) || filePath;
}

function main(): void {
  const argv = process.argv.slice(2);
  const fix = argv.includes("--fix");
  const targets = resolveTargets(argv.filter((arg) => arg !== "--fix"));

  if (targets.length === 0) {
    console.error("No markdown files to check.");
    process.exit(2);
  }

  const reports: SentencePerLineReport[] = [];
  let rewritten = 0;

  for (const filePath of targets) {
    const source = fs.readFileSync(filePath, "utf8");
    if (fix) {
      const formatted = formatMarkdown(source);
      if (formatted !== source) {
        fs.writeFileSync(filePath, formatted);
        rewritten += 1;
      }
      const report = checkMarkdown(formatted, relativePath(filePath));
      if (report.violations.length > 0) {
        reports.push(report);
      }
    } else {
      const report = checkMarkdown(source, relativePath(filePath));
      if (report.changed || report.violations.length > 0) {
        reports.push(report);
      }
    }
  }

  if (fix) {
    const noun = rewritten === 1 ? "file" : "files";
    console.log(`Rewrote ${rewritten} ${noun} to sentence-per-line form.`);
  }

  if (reports.length > 0) {
    console.error(formatReport(reports));
    const total = reports.reduce((sum, report) => sum + report.violations.length, 0);
    console.error(
      `\n${total} sentence-per-line issue(s) in ${reports.length} file(s).` +
        (fix ? "" : " Re-run with --fix or `just fix-prose` to apply safe rewrites."),
    );
    process.exit(1);
  }
}

main();
