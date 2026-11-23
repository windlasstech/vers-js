// Allow: SIZE_OK — The required REL-01–REL-09 matrix and shared fake must stay in this sole owned test file.
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, expect, it } from "vitest";

import { convergeRelease } from "../scripts/converge-github-release.mjs";

const { join } = path,
  tag = "v0.1.3",
  tarball = "windlass-vers-js-0.1.3.tgz",
  names = [tarball, `${tarball}.sha256`, `${tarball}.sha512`, `${tarball}.intoto.jsonl`],
  body = "Release notes\n",
  create = [
    "release",
    "create",
    tag,
    "--draft",
    "--verify-tag",
    "--title",
    tag,
    "--notes-file",
    "release-notes.md",
  ],
  edit = ["release", "edit", tag, "--draft=false", "--verify-tag"],
  ok = { code: 0, stderr: "", stdout: "" },
  failed = { code: 1, stderr: "connection interrupted", stdout: "" };
let cwd = "";

function release(count = 4, isDraft = true) {
  return {
    assets: names.slice(0, count).map((name) => ({ name })),
    body,
    isDraft,
    isPrerelease: false,
    name: tag,
    tagName: tag,
  };
}

function fakeGh(initial, fault = {}) {
  const calls = [],
    bytes = new Map(names.map((name) => [name, `bytes:${name}`]));
  let remote = initial,
    fired = false;
  function mutate(args) {
    switch (args[1]) {
      case "create": {
        remote = release(0);
        break;
      }
      case "upload": {
        remote.assets.push({ name: args[3] });
        fault.afterUpload?.(remote, bytes);
        break;
      }
      case "edit": {
        remote.isDraft = false;
        break;
      }
      default: {
        throw new Error("Unexpected fake command");
      }
    }
  }
  // Keep fault injection and its remote effect together in this test adapter.
  // oxlint-disable-next-line max-statements
  async function runGh(args) {
    calls.push(args);
    const { 1: command, 4: name, 6: directory } = args;
    if (command === "view") {
      if (fault.read) {
        return fault.read;
      }
      return remote
        ? { ...ok, stdout: JSON.stringify(remote) }
        : { ...failed, stderr: "release not found" };
    }
    if (command === "download") {
      if (fault.download) {
        return failed;
      }
      await writeFile(join(directory, name), fault.corrupt === name ? "corrupt" : bytes.get(name));
      return ok;
    }
    const interrupted = fault.command === command && !fired;
    if (interrupted) {
      fired = true;
    }
    if (!(interrupted && fault.before)) {
      mutate(args);
    }
    if (interrupted && fault.conflict) {
      remote.name = "conflict";
    }
    return interrupted ? failed : ok;
  }
  return {
    calls,
    mutations: () => calls.filter((args) => ["create", "upload", "edit"].includes(args[1])),
    runGh,
  };
}

async function converge(fake) {
  return convergeRelease({ cwd, tag, tarball }, fake.runGh);
}

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), "release-test-"));
  await Promise.all(names.map((name) => writeFile(join(cwd, name), `bytes:${name}`)));
  await writeFile(join(cwd, "release-notes.md"), body);
});
afterEach(async () => {
  await rm(cwd, { force: true, recursive: true });
});

it("REL-01 creates a draft without assets, uploads, verifies, then publishes when absent", async () => {
  const fake = fakeGh(null);
  await converge(fake);
  expect(fake.mutations()).toEqual([
    create,
    ...names.map((name) => ["release", "upload", tag, name]),
    edit,
  ]);
  const publishIndex = fake.calls.findIndex((args) => args[1] === "edit"),
    lastUpload = fake.calls.findLastIndex((args) => args[1] === "upload"),
    verification = fake.calls.slice(lastUpload + 1, publishIndex);
  expect(verification[0]).toEqual([
    "release",
    "view",
    tag,
    "--json",
    "tagName,name,isDraft,isPrerelease,body,assets",
  ]);
  expect(
    verification.filter((args) => args[1] === "download").map((args) => args.slice(0, 6)),
  ).toEqual(names.map((name) => ["release", "download", tag, "--pattern", name, "--dir"]));
});

it("REL-02 leaves a matching published release unchanged", async () => {
  const fake = fakeGh(release(4, false));
  await converge(fake);
  expect(fake.mutations()).toEqual([]);
  expect(fake.calls.filter((args) => args[1] === "download")).toHaveLength(4);
});

it.each([0, 2, 4])(
  "REL-03 uploads only missing assets when draft contains %i assets",
  async (count) => {
    const fake = fakeGh(release(count));
    await converge(fake);
    expect(fake.mutations()).toEqual([
      ...names.slice(count).map((name) => ["release", "upload", tag, name]),
      edit,
    ]);
    const firstMutation = fake.calls.findIndex((args) => ["upload", "edit"].includes(args[1]));
    expect(
      fake.calls.slice(0, firstMutation).filter((args) => args[1] === "download"),
    ).toHaveLength(count);
  },
);

it("REL-04 fails without mutations when published assets are incomplete", async () => {
  const fake = fakeGh(release(2, false));
  await expect(converge(fake)).rejects.toMatchObject({ code: "release.conflict-assets" });
  expect(fake.mutations()).toEqual([]);
});

it.each([
  ["title", { name: "other" }, "release.conflict-metadata"],
  ["tag", { tagName: "v9" }, "release.conflict-metadata"],
  ["body", { body: "other" }, "release.conflict-metadata"],
  ["prerelease", { isPrerelease: true }, "release.conflict-metadata"],
  ["unexpected asset", { assets: [{ name: "extra" }] }, "release.conflict-assets"],
  [
    "duplicate names",
    { assets: [{ name: tarball }, { name: tarball }] },
    "release.conflict-assets",
  ],
])("REL-05 rejects %s before mutations", async (_label, changes, code) => {
  const fake = fakeGh({ ...release(), ...changes });
  await expect(converge(fake)).rejects.toMatchObject({ code });
  expect(fake.mutations()).toEqual([]);
});

it.each([true, false])("REL-05 rejects existing byte mismatch when draft=%s", async (draft) => {
  const fake = fakeGh(release(4, draft), { corrupt: tarball });
  await expect(converge(fake)).rejects.toMatchObject({ code: "release.conflict-content" });
  expect(fake.mutations()).toEqual([]);
});

it.each([
  failed,
  { ...failed, stderr: "HTTP 404: Not Found (repository unavailable)" },
  { ...failed, stderr: "gh: Release not found (HTTP 404)" },
  {
    ...failed,
    stderr:
      "failed to run git: fatal: not a git repository (or any of the parent directories): .git",
  },
  { ...ok, stdout: "invalid json" },
  { ...ok, stdout: "{}" },
])("REL-06 treats unproven reads as indeterminate: %j", async (read) => {
  const fake = fakeGh(null, { read });
  await expect(converge(fake)).rejects.toMatchObject({ code: "release.indeterminate" });
  expect(fake.mutations()).toEqual([]);
});

it.each(["release not found", "Release not found", "release not found \n"])(
  "REL-06 treats the unambiguous not-found message %j as absent",
  async (stderr) => {
    const inner = fakeGh(null);
    let first = true;
    const runGh = async (args) => {
      if (first && args[1] === "view") {
        first = false;
        return { ...failed, stderr };
      }
      return inner.runGh(args);
    };
    await convergeRelease({ cwd, tag, tarball }, runGh);
    expect(inner.mutations()).toEqual([
      create,
      ...names.map((name) => ["release", "upload", tag, name]),
      edit,
    ]);
  },
);

it.each(["create", "upload", "edit"])(
  "REL-07 resumes after an acknowledged-lost %s without repeating it",
  async (command) => {
    const fake = fakeGh(null, { command });
    await converge(fake);
    expect(fake.mutations()).toEqual([
      create,
      ...names.map((name) => ["release", "upload", tag, name]),
      edit,
    ]);
  },
);

it.each(["create", "upload", "edit"])(
  "REL-07 stops after failed %s with no proven effect, then a second invocation converges",
  async (command) => {
    const fake = fakeGh(command === "upload" ? release(2) : null, { before: true, command });
    await expect(converge(fake)).rejects.toMatchObject({ code: "release.indeterminate" });
    const firstCalls = fake.calls.length;
    expect(fake.calls.at(-1)[1] === "view" || fake.calls.at(-1)[1] === "download").toBe(true);
    await converge(fake);
    const uploads = fake.calls.slice(firstCalls).filter((args) => args[1] === "upload");
    expect(uploads).toEqual(
      command === "edit"
        ? []
        : names.slice(command === "upload" ? 2 : 0).map((name) => ["release", "upload", tag, name]),
    );
  },
);

it("REL-07 rejects incompatible state after ambiguous creation", async () => {
  const fake = fakeGh(null, { command: "create", conflict: true });
  await expect(converge(fake)).rejects.toMatchObject({ code: "release.conflict-metadata" });
  expect(fake.mutations()).toEqual([create]);
});

it.each(["bytes", "metadata", "missing"])(
  "REL-08 leaves the draft untouched after post-upload %s mismatch",
  async (kind) => {
    const fake = fakeGh(release(3), {
        afterUpload: (remote, bytes) => {
          switch (kind) {
            case "bytes": {
              bytes.set(names[3], "corrupt");
              break;
            }
            case "metadata": {
              remote.body = "changed";
              break;
            }
            case "missing": {
              remote.assets.pop();
              break;
            }
            default: {
              throw new Error("Unexpected test case");
            }
          }
        },
      }),
      codes = {
        bytes: "release.conflict-content",
        metadata: "release.conflict-metadata",
        missing: "release.indeterminate",
      };
    await expect(converge(fake)).rejects.toMatchObject({ code: codes[kind] });
    expect(fake.mutations()).toEqual([["release", "upload", tag, names[3]]]);
  },
);

it("REL-09 performs no mutations on the second complete invocation", async () => {
  const fake = fakeGh(null);
  await converge(fake);
  const count = fake.mutations().length;
  await converge(fake);
  expect(fake.mutations()).toHaveLength(count);
});

it("fails before remote access when a local asset is absent", async () => {
  const fake = fakeGh(null);
  await rm(join(cwd, names[3]));
  await expect(converge(fake)).rejects.toMatchObject({ code: "release.local-input" });
  expect(fake.calls).toEqual([]);
});

it.each([false, true])(
  "cleans fresh download directories even when download fails=%s",
  async (download) => {
    const fake = fakeGh(release(4, false), { download });
    await (download
      ? expect(converge(fake)).rejects.toMatchObject({ code: "release.indeterminate" })
      : converge(fake));
    const directories = fake.calls.filter((args) => args[1] === "download").map((args) => args[6]);
    expect(new Set(directories).size).toBe(directories.length);
    await Promise.all(
      directories.map(async (directory) => {
        await expect(stat(directory)).rejects.toMatchObject({ code: "ENOENT" });
      }),
    );
    expect(await readFile(join(cwd, tarball), "utf8")).toBe(`bytes:${tarball}`);
  },
);
