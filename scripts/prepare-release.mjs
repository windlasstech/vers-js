#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const argumentOffset = 2;
const commandSuccess = 0;
const helpExitCode = 0;
const failureExitCode = 1;
const noHeadingFound = -1;
const releaseDatePattern = /^12\d{3}-\d{2}-\d{2}$/;
const optionAssignments = {
  "--help": "help",
  "--push": "pushTag",
  "--skip-checks": "skipChecks",
  "--skip-pack": "skipPack",
  "--tag": "createTag",
  "-h": "help",
};

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.join(scriptDirectory, "..");

const qualityCommands = [
  ["pnpm", ["run", "fmt:check"]],
  ["pnpm", ["run", "lint:ts"]],
  ["pnpm", ["run", "lint:md"]],
  ["pnpm", ["run", "typecheck"]],
  ["pnpm", ["run", "test"]],
  ["pnpm", ["run", "test:coverage"]],
  ["pnpm", ["run", "build"]],
  ["pnpm", ["run", "verify:package"]],
  ["pnpm", ["run", "smoke:runtime:node"]],
];

const options = parseArguments(process.argv.slice(argumentOffset));

if (options.help) {
  printHelp();
  process.exit(helpExitCode);
}

try {
  await main(options);
} catch (error) {
  console.error(`\nrelease preparation failed: ${error.message}`);
  process.exit(failureExitCode);
}

async function main(currentOptions) {
  process.chdir(repositoryRoot);

  const release = readReleaseContext();

  if (!currentOptions.skipChecks) {
    runQualityChecks();
  }

  const packSummary = currentOptions.skipPack ? undefined : inspectPackageContents();
  const notesPath = writeReleaseNotes(release.tagName, release.notes);

  printPreparationSummary(release.tagName, notesPath, packSummary);
  await maybeCreateTag(
    release.tagName,
    buildTagAnnotation(release.tagName, release.notes),
    currentOptions,
  );
}

function readReleaseContext() {
  const version = readPackageVersion();
  const tagName = `v${version}`;
  const changelog = readFileSync("CHANGELOG.md", "utf8");

  assertCleanWorkingTree();
  assertCurrentBranchIsMain();
  assertVersion(version);
  assertTagDoesNotExist(tagName);
  assertUnreleasedCompareLink(changelog, tagName);

  return {
    notes: extractReleaseNotes(changelog, version),
    tagName,
  };
}

function printPreparationSummary(tagName, notesPath, packSummary) {
  console.log(`\nPrepared ${tagName}`);
  console.log(`Release notes: ${notesPath}`);

  if (packSummary) {
    console.log(`Package dry run: ${packSummary.name}@${packSummary.version}`);
    console.log(`Package files: ${packSummary.entryCount}`);
  }
}

async function maybeCreateTag(tagName, tagAnnotation, currentOptions) {
  if (!currentOptions.createTag) {
    console.log(
      "Tag not created. Re-run with --tag to create and verify the signed annotated tag.",
    );
    return;
  }

  const annotationPath = writeTagAnnotation(tagName, tagAnnotation);
  const finalAnnotation = await reviewTagAnnotation(annotationPath);
  writeFileSync(annotationPath, finalAnnotation, "utf8");

  runCommand("git", ["tag", "-s", "-a", tagName, "-F", annotationPath]);
  runCommand("git", ["tag", "-v", tagName]);
  console.log(`Signed tag verified: ${tagName}`);
  maybePushTag(tagName, currentOptions);
}

function buildTagAnnotation(tagName, releaseNotes) {
  return `${tagName}\n\n${releaseNotes.trimEnd()}\n`;
}

async function reviewTagAnnotation(annotationPath) {
  let tagAnnotation = readFileSync(annotationPath, "utf8");
  printTagAnnotation(tagAnnotation, "Generated signed tag annotation");

  if (!(await shouldEditTagAnnotation())) {
    return tagAnnotation;
  }

  openEditor(annotationPath);
  tagAnnotation = readFileSync(annotationPath, "utf8");
  assertTagAnnotationNotEmpty(tagAnnotation);
  printTagAnnotation(tagAnnotation, "Edited signed tag annotation");

  return tagAnnotation;
}

function printTagAnnotation(tagAnnotation, heading) {
  console.log(`\n${heading}`);
  console.log("=".repeat(heading.length));
  console.log(tagAnnotation.trimEnd());
}

async function shouldEditTagAnnotation() {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await readline.question(
      "\nEdit tag annotation before creating the signed tag? [y/N] ",
    );
    const normalizedAnswer = answer.trim().toLowerCase();

    return normalizedAnswer === "y" || normalizedAnswer === "yes";
  } finally {
    readline.close();
  }
}

function openEditor(annotationPath) {
  const editor = process.env.GIT_EDITOR || process.env.VISUAL || process.env.EDITOR || "vi";
  const [command, ...editorArguments] = parseEditorCommand(editor);
  const result = spawnSync(command, [...editorArguments, annotationPath], {
    cwd: repositoryRoot,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== commandSuccess) {
    throw new Error(`editor failed: ${editor}`);
  }
}

function parseEditorCommand(editor) {
  const editorParts = editor.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];

  if (editorParts.length === 0) {
    throw new Error("editor command must not be empty");
  }

  return editorParts.map((part) => part.replace(/^(?<quote>["'])(?<body>.*)\k<quote>$/, "$<body>"));
}

function assertTagAnnotationNotEmpty(tagAnnotation) {
  if (tagAnnotation.trim() === "") {
    throw new Error("signed tag annotation must not be empty");
  }
}

function maybePushTag(tagName, currentOptions) {
  if (!currentOptions.pushTag) {
    console.log(`Next step: git push origin ${tagName}`);
    return;
  }

  runCommand("git", ["push", "origin", tagName]);
  console.log(`Pushed tag: ${tagName}`);
}

function parseArguments(arguments_) {
  const parsed = defaultOptions();

  for (const argument of arguments_) {
    applyOption(parsed, argument);
  }

  assertCompatibleOptions(parsed);

  return parsed;
}

function defaultOptions() {
  return {
    createTag: false,
    help: false,
    pushTag: false,
    skipChecks: false,
    skipPack: false,
  };
}

function applyOption(parsed, argument) {
  if (argument === "--") {
    return;
  }

  const optionName = optionAssignments[argument];

  if (!optionName) {
    throw new Error(`unknown option: ${argument}`);
  }

  parsed[optionName] = true;
}

function assertCompatibleOptions(parsed) {
  if (parsed.pushTag && !parsed.createTag) {
    throw new Error(
      "--push requires --tag so the script creates, verifies, and pushes the same signed tag",
    );
  }
}

function printHelp() {
  console.log(`Usage: pnpm run release:prepare -- [options]

Validates the local checkout for a vers-js release, extracts the matching
CHANGELOG.md section to .release/release-notes-<tag>.md, and optionally previews,
edits, creates, verifies, and pushes the signed annotated release tag.

Options:
  --tag          Preview CHANGELOG-based annotation, then create and verify tag
  --push         Push the tag to origin after --tag verification
  --skip-checks  Skip the project quality and runtime verification commands
  --skip-pack    Skip pnpm pack --json --dry-run
  -h, --help     Show this help

Default behavior validates and writes release notes, but does not create a tag.`);
}

function readPackageVersion() {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  return packageJson.version;
}

function assertCleanWorkingTree() {
  const status = captureCommand("git", ["status", "--porcelain=v1"]);

  if (status.trim() !== "") {
    throw new Error("working tree must be clean before preparing a release");
  }
}

function assertCurrentBranchIsMain() {
  const branch = captureCommand("git", ["branch", "--show-current"]).trim();

  if (branch !== "main") {
    throw new Error(`release tags must be created from main, not ${branch || "detached HEAD"}`);
  }
}

function assertVersion(version) {
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`package.json version must be x.y.z, got ${JSON.stringify(version)}`);
  }
}

function assertTagDoesNotExist(tagName) {
  const matchingTag = captureCommand("git", ["tag", "--list", tagName]).trim();

  if (matchingTag !== "") {
    throw new Error(`tag already exists: ${tagName}`);
  }
}

function extractReleaseNotes(changelog, version) {
  const headingMatch = findReleaseHeading(changelog, version);

  if (!headingMatch) {
    throw new Error(`CHANGELOG.md must contain a Human Era section for ${version}`);
  }

  const sectionStart = headingMatch.index + headingMatch.text.length;
  const sectionBody = releaseSectionBody(changelog, sectionStart);
  const notes = sectionBody.trim();

  assertReleaseNotesNotEmpty(notes, version);

  return `${notes}\n`;
}

function findReleaseHeading(changelog, version) {
  const expectedPrefix = `## [${version}] - `;
  let lineStart = 0;

  for (const rawLine of changelog.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;

    if (line.startsWith(expectedPrefix)) {
      const releaseDate = line.slice(expectedPrefix.length);

      if (releaseDatePattern.test(releaseDate)) {
        return { index: lineStart, text: rawLine };
      }
    }

    lineStart += rawLine.length + 1;
  }

  return undefined;
}

function assertReleaseNotesNotEmpty(notes, version) {
  if (notes === "") {
    throw new Error(`CHANGELOG.md section for ${version} must not be empty`);
  }
}

function releaseSectionBody(changelog, sectionStart) {
  const remainingChangelog = changelog.slice(sectionStart);
  const sectionEndIndex = firstSectionTerminatorIndex(remainingChangelog);

  if (sectionEndIndex === noHeadingFound) {
    return remainingChangelog;
  }

  return remainingChangelog.slice(0, sectionEndIndex);
}

function firstSectionTerminatorIndex(markdown) {
  const nextHeadingIndex = markdown.search(/^## /m);
  const linkReferenceIndex = markdown.search(/^\[[^\]]+\]: /m);

  if (nextHeadingIndex === noHeadingFound) {
    return linkReferenceIndex;
  }

  if (linkReferenceIndex === noHeadingFound) {
    return nextHeadingIndex;
  }

  return Math.min(nextHeadingIndex, linkReferenceIndex);
}

function assertUnreleasedCompareLink(changelog, tagName) {
  const expectedLink = `[Unreleased]: https://github.com/windlasstech/vers-js/compare/${tagName}...HEAD`;

  if (!changelog.includes(expectedLink)) {
    throw new Error(`CHANGELOG.md must include latest Unreleased comparison link: ${expectedLink}`);
  }
}

function runQualityChecks() {
  for (const [command, arguments_] of qualityCommands) {
    runCommand(command, arguments_);
  }
}

function inspectPackageContents() {
  const output = captureCommand("pnpm", ["pack", "--json", "--dry-run"], { inheritStderr: true });
  const [packResult] = JSON.parse(output);

  return {
    entryCount: packResult.files.length,
    name: packResult.name,
    version: packResult.version,
  };
}

function writeReleaseNotes(tagName, releaseNotes) {
  const releaseDirectory = path.join(repositoryRoot, ".release");
  mkdirSync(releaseDirectory, { recursive: true });

  const notesPath = path.join(releaseDirectory, `release-notes-${tagName}.md`);
  writeFileSync(notesPath, releaseNotes, "utf8");

  return notesPath;
}

function writeTagAnnotation(tagName, tagAnnotation) {
  const releaseDirectory = path.join(repositoryRoot, ".release");
  mkdirSync(releaseDirectory, { recursive: true });

  const annotationPath = path.join(releaseDirectory, `tag-annotation-${tagName}.md`);
  writeFileSync(annotationPath, tagAnnotation, "utf8");

  return annotationPath;
}

function runCommand(command, arguments_) {
  console.log(`\n$ ${[command, ...arguments_].join(" ")}`);

  const result = spawnSync(command, arguments_, {
    cwd: repositoryRoot,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== commandSuccess) {
    throw new Error(`command failed: ${[command, ...arguments_].join(" ")}`);
  }
}

function captureCommand(command, arguments_, commandOptions = {}) {
  return execFileSync(command, arguments_, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: commandOptions.inheritStderr
      ? ["ignore", "pipe", "inherit"]
      : ["ignore", "pipe", "pipe"],
  });
}
