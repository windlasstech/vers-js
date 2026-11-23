import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { join, resolve } = path;

class ReleaseError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = "ReleaseError";
    this.code = code;
  }
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function loadExpected({ tag, tarball, cwd }) {
  // Names are literal gh operands, upload filenames, and download patterns.
  if (
    typeof tag !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/u.test(tag) ||
    typeof tarball !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.tgz$/u.test(tarball)
  ) {
    throw new ReleaseError("release.local-input", "Invalid release tag or tarball name");
  }
  const names = [tarball, `${tarball}.sha256`, `${tarball}.sha512`, `${tarball}.intoto.jsonl`];
  try {
    const body = await readFile(join(cwd, "release-notes.md"), "utf8"),
      hashes = new Map(
        await Promise.all(
          names.map(async (name) => [name, digest(await readFile(join(cwd, name)))]),
        ),
      );
    return { body, hashes, names, tag };
  } catch (error) {
    throw new ReleaseError("release.local-input", "Cannot read local release inputs", error);
  }
}

function parseRemoteRelease(stdout) {
  try {
    const remote = JSON.parse(stdout);
    if (
      !remote ||
      typeof remote !== "object" ||
      !["tagName", "name", "body"].every((key) => typeof remote[key] === "string") ||
      typeof remote.isDraft !== "boolean" ||
      typeof remote.isPrerelease !== "boolean" ||
      !Array.isArray(remote.assets) ||
      !remote.assets.every((asset) => asset && typeof asset.name === "string")
    ) {
      throw new TypeError("Invalid release response");
    }
    return remote;
  } catch (error) {
    throw new ReleaseError("release.indeterminate", "Invalid release response", error);
  }
}

async function inspectRemoteRelease(runGh, tag) {
  try {
    const result = await runGh([
      "release",
      "view",
      tag,
      "--json",
      "tagName,name,isDraft,isPrerelease,body,assets",
    ]);
    if (result.code === 0) {
      return parseRemoteRelease(result.stdout);
    }
    // Generic HTTP 404 responses can hide repository or authentication failures.
    // Only an unambiguous not-found message proves absence.
    // Gh emits exactly "release not found", so only case and whitespace variation is accepted.
    // Any additional content is indeterminate.
    if (result.stderr.trim().toLowerCase() === "release not found") {
      return null;
    }
    throw new ReleaseError("release.indeterminate", "Release lookup failed");
  } catch (error) {
    throw new ReleaseError("release.indeterminate", "Cannot inspect release", error);
  }
}

// Plans describe the next transition only. Every transition is followed by a
// Fresh observation, so a stale plan is never replayed after an ambiguous write.
// Keep the complete safety decision table visible in one pure function.
// oxlint-disable-next-line max-statements
function planConvergence(remote, expected) {
  if (remote === null) {
    return {
      args: [
        "release",
        "create",
        expected.tag,
        "--draft",
        "--verify-tag",
        "--title",
        expected.tag,
        "--notes-file",
        "release-notes.md",
      ],
      kind: "create",
    };
  }
  if (
    remote.tagName !== expected.tag ||
    remote.name !== expected.tag ||
    remote.body !== expected.body ||
    remote.isPrerelease
  ) {
    throw new ReleaseError("release.conflict-metadata", "Remote release metadata differs");
  }
  const present = remote.assets.map((asset) => asset.name),
    missing = expected.names.filter((name) => !present.includes(name));
  if (
    new Set(present).size !== present.length ||
    present.some((name) => !expected.names.includes(name)) ||
    (!remote.isDraft && missing.length > 0)
  ) {
    throw new ReleaseError("release.conflict-assets", "Remote release asset set differs");
  }
  if (!remote.isDraft) {
    return { kind: "done" };
  }
  if (missing.length > 0) {
    return {
      args: ["release", "upload", expected.tag, missing[0]],
      kind: "upload",
      name: missing[0],
    };
  }
  return {
    args: ["release", "edit", expected.tag, "--draft=false", "--verify-tag"],
    kind: "publish",
  };
}

// Sequential downloads bound disk usage and finish cleanup before any mutation.
/* oxlint-disable no-await-in-loop */
// The download, digest comparison, and cleanup share one resource lifetime.
// oxlint-disable-next-line max-statements
async function verifyAssets(remote, expected, runGh) {
  for (const asset of remote?.assets ?? []) {
    const directory = await mkdtemp(join(tmpdir(), "vers-release-"));
    try {
      const result = await runGh([
        "release",
        "download",
        expected.tag,
        "--pattern",
        asset.name,
        "--dir",
        directory,
      ]);
      if (result.code !== 0) {
        throw new ReleaseError("release.indeterminate", "Asset download failed");
      }
      const hash = digest(await readFile(join(directory, asset.name)));
      if (hash !== expected.hashes.get(asset.name)) {
        throw new ReleaseError("release.conflict-content", "Remote asset bytes differ");
      }
    } catch (error) {
      if (error instanceof ReleaseError) {
        throw error;
      }
      throw new ReleaseError("release.indeterminate", "Cannot verify remote asset", error);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  }
}

async function executePlan(plan, runGh) {
  try {
    return await runGh(plan.args);
  } catch (error) {
    // A lost connection is not proof that the server did not apply the write.
    return {
      code: 1,
      stderr: error instanceof Error ? error.message : "Executor failure",
      stdout: "",
    };
  }
}

// Each mutation has a distinct postcondition; keep these cases together.
// oxlint-disable-next-line max-statements
function assertProgress(plan, previous, remote) {
  if (
    remote === null ||
    previous?.assets.some((asset) => !remote.assets.some((next) => next.name === asset.name))
  ) {
    throw new ReleaseError("release.indeterminate", "Release or existing asset disappeared");
  }
  switch (plan.kind) {
    case "create": {
      return;
    }
    case "upload": {
      if (remote.assets.some((asset) => asset.name === plan.name)) {
        return;
      }
      break;
    }
    case "publish": {
      if (!remote.isDraft) {
        return;
      }
      break;
    }
    default: {
      throw new ReleaseError("release.indeterminate", "Invalid transition");
    }
  }
  throw new ReleaseError("release.indeterminate", "Mutation effect could not be confirmed");
}

async function convergeRelease(options, runGh) {
  const expected = await loadExpected(options);
  let remote = await inspectRemoteRelease(runGh, expected.tag),
    plan = planConvergence(remote, expected);
  await verifyAssets(remote, expected, runGh);
  while (plan.kind !== "done") {
    await executePlan(plan, runGh);
    // Exactly one read-back, even on failure. Never retry a mutation whose
    // Effect is absent or uncertain; a later invocation may safely resume.
    const observed = await inspectRemoteRelease(runGh, expected.tag),
      nextPlan = planConvergence(observed, expected);
    await verifyAssets(observed, expected, runGh);
    assertProgress(plan, remote, observed);
    remote = observed;
    plan = nextPlan;
  }
}

/* oxlint-enable no-await-in-loop */

async function runGhCommand(args) {
  return new Promise((fulfill) => {
    execFile("gh", args, { encoding: "utf8" }, (error, stdout, stderr) => {
      fulfill({ code: error ? 1 : 0, stderr, stdout });
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await convergeRelease(
      { cwd: process.cwd(), tag: process.env.RELEASE_TAG, tarball: process.env.TARBALL_NAME },
      runGhCommand,
    );
  } catch (error) {
    console.error(error instanceof ReleaseError ? error.code : "release.indeterminate");
    process.exitCode = 1;
  }
}

export { convergeRelease, executePlan, inspectRemoteRelease, planConvergence };
