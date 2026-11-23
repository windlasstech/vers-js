// Allow: SIZE_OK — The task requires one file for this data-driven regression matrix and CLI cases.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseStrictJson } from "../scripts/strict-json.mjs";
import { verifyReleaseProvenance } from "../scripts/verify-release-provenance.mjs";

const bundleText = readFileSync(
    new URL("fixtures/release/sigstore-bundle-valid.json", import.meta.url),
    "utf8",
  ),
  fixture = JSON.parse(bundleText),
  statement = JSON.parse(Buffer.from(fixture.dsseEnvelope.payload, "base64").toString("utf8")),
  expected = {
    expectedSha256: statement.subject[0].digest.sha256,
    expectedSha512: statement.subject[0].digest.sha512,
    packageName: "@windlass/vers-js",
    packageVersion: "0.1.3",
  };

function writePoisonedBundle(directory) {
  const poisoned = structuredClone(fixture);
  poisoned.verificationMaterial.note = "PLACEHOLDER";
  const bytes = Buffer.from(JSON.stringify(poisoned), "utf8"),
    marker = bytes.indexOf("PLACEHOLDER");
  expect(marker).toBeGreaterThan(-1);
  bytes[marker] = 255;
  writeFileSync(path.join(directory, "package.tgz.intoto.jsonl"), bytes);
}

function runCli(directory) {
  return spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../scripts/verify-release-provenance.mjs", import.meta.url))],
    {
      cwd: directory,
      encoding: "utf8",
      env: {
        ...process.env,
        EXPECTED_SHA256: expected.expectedSha256,
        EXPECTED_SHA512: expected.expectedSha512,
        PACKAGE_NAME: expected.packageName,
        PACKAGE_VERSION: expected.packageVersion,
        TARBALL_NAME: "package.tgz",
      },
    },
  );
}

function verify(bundle) {
  return verifyReleaseProvenance({ ...expected, bundleText: JSON.stringify(bundle) });
}

function withStatement(text) {
  const bundle = structuredClone(fixture);
  bundle.dsseEnvelope.payload = Buffer.from(text).toString("base64");
  return bundle;
}

describe("strict JSON", () => {
  it.each([
    ' \t\r\n{"a":[null,true,false,-12.5e+2,{},[],"\\\"\\\\\\/\\b\\f\\n\\r\\t\\u0061"]} ',
    "0",
    "-0",
    "1E-2",
    '"😀"',
  ])("JSON-01 parses %s", (text) => {
    // Given JSON grammar, when parsed, then native values are preserved.
    expect(parseStrictJson(text)).toEqual(JSON.parse(text));
  });
  it("JSON-01 keeps __proto__ as an own data member without polluting prototypes", () => {
    // The security contract is an own data member plus an unpolluted global prototype.
    const value = parseStrictJson('{"__proto__":{"polluted":true}}');
    expect(Object.hasOwn(value, "__proto__")).toBe(true);
    expect(Object.getOwnPropertyDescriptor(value, "__proto__")?.value).toEqual({
      polluted: true,
    });
    expect(Object.prototype.polluted).toBeUndefined();
  });
  it.each([
    '{"a":1,"a":2}',
    '{"verificationMaterial":{"a":[{"b":1,"b":2}]}}',
    '{"dsseEnvelope":{"payload":"x","payload":"y"}}',
    '{"predicate":{"a":{"b":1,"b":2}}}',
    String.raw`{"subject":1,"\u0073ubject":2}`,
    String.raw`{"😀":1,"\ud83d\ude00":2}`,
  ])("JSON-02/03/04 rejects duplicate names: %s", (text) => {
    expect(() => parseStrictJson(text)).toThrow(
      expect.objectContaining({ code: "json.duplicate-member" }),
    );
  });
  it("JSON-02 rejects a document that native parsing silently overwrites", () => {
    const text = '{"subject":0,"subject":1}';
    expect(JSON.parse(text).subject).toBe(1);
    expect(() => parseStrictJson(text)).toThrow(
      expect.objectContaining({ code: "json.duplicate-member" }),
    );
  });
  it.each([
    "",
    "undefined",
    "NaN",
    "01",
    "+1",
    "1.",
    ".1",
    "1e",
    "[1,]",
    '{"a":1,}',
    "{a:1}",
    '{"a" 1}',
    "[1 2]",
    String.raw`"\x00"`,
    String.raw`"\u12xz"`,
    '"\n"',
    '"unterminated',
    "\uFEFF{}",
    "{}\n{}",
    "true false",
  ])("JSON-05 rejects malformed or multiple documents: %s", (text) => {
    expect(() => parseStrictJson(text)).toThrow(
      expect.objectContaining({ code: "json.syntax-invalid" }),
    );
  });
});

describe("release provenance (issue #80)", () => {
  it("PROV-01 accepts only the actual nested bundle payload", () => {
    expect(Object.hasOwn(fixture, "payload")).toBe(false);
    expect(() => verifyReleaseProvenance({ ...expected, bundleText })).not.toThrow();
  });
  it.each([false, true])("PROV-02 rejects legacy payload with nested=%s", (nested) => {
    const bundle = { ...fixture, payload: fixture.dsseEnvelope.payload };
    if (!nested) {
      delete bundle.dsseEnvelope;
    }
    expect(() => verify(bundle)).toThrow(
      expect.objectContaining({ code: "bundle.legacy-payload" }),
    );
  });
  it.each([
    ["mediaType", "wrong", "bundle.media-type-invalid"],
    ["verificationMaterial", null, "bundle.verification-material-invalid"],
    ["verificationMaterial", [], "bundle.verification-material-invalid"],
    ["verificationMaterial", "certificate", "bundle.verification-material-invalid"],
    ["dsseEnvelope", null, "bundle.envelope-invalid"],
    ["dsseEnvelope", [], "bundle.envelope-invalid"],
    ["messageSignature", {}, "bundle.message-signature-unsupported"],
  ])("PROV-03 rejects %s=%j", (key, value, code) => {
    expect(() => verify({ ...fixture, [key]: value })).toThrow(expect.objectContaining({ code }));
  });
  it.each([
    ["payload", undefined, "bundle.payload-invalid"],
    ["payload", "", "bundle.payload-invalid"],
    ["payloadType", "text/plain", "bundle.payload-type-invalid"],
    ["signatures", [], "bundle.signatures-invalid"],
    ["signatures", [{ sig: "a" }, { sig: "b" }], "bundle.signatures-invalid"],
    ["signatures", [{ sig: "" }], "bundle.signatures-invalid"],
    ["signatures", [null], "bundle.signatures-invalid"],
    ["signatures", [{}], "bundle.signatures-invalid"],
    ["signatures", [{ sig: 1 }], "bundle.signatures-invalid"],
    ["signatures", {}, "bundle.signatures-invalid"],
  ])("PROV-03 rejects envelope %s=%j", (key, value, code) => {
    const bundle = { ...fixture, dsseEnvelope: { ...fixture.dsseEnvelope, [key]: value } };
    expect(() => verify(bundle)).toThrow(expect.objectContaining({ code }));
  });
  it.each(["null", "[]", "1"])("PROV-03 rejects root %s", (text) => {
    expect(() => verifyReleaseProvenance({ ...expected, bundleText: text })).toThrow(
      expect.objectContaining({ code: "bundle.object-invalid" }),
    );
  });
});

describe("Statement integrity (issue #80)", () => {
  it.each(["Zg", "Zh==", "Zg===", "Zg==\n", "____", "!!!!"])(
    "PROV-04 rejects noncanonical base64 %s",
    (payload) => {
      expect(() =>
        verify({ ...fixture, dsseEnvelope: { ...fixture.dsseEnvelope, payload } }),
      ).toThrow(expect.objectContaining({ code: "bundle.payload-invalid" }));
    },
  );
  it("PROV-04 rejects invalid UTF-8", () => {
    const bundle = { ...fixture, dsseEnvelope: { ...fixture.dsseEnvelope, payload: "/w==" } };
    expect(() => verify(bundle)).toThrow(
      expect.objectContaining({ code: "statement.utf8-invalid" }),
    );
  });
  it.each(["{", "{}\n{}", "\uFEFF{}"])("PROV-04 rejects malformed Statement %s", (text) => {
    expect(() => verify(withStatement(text))).toThrow(
      expect.objectContaining({ code: "statement.syntax-invalid" }),
    );
  });
  it.each([
    ["_type", "wrong", "statement.type-invalid"],
    ["predicateType", "wrong", "statement.predicate-type-invalid"],
    ["subject", [], "statement.subject-count-invalid"],
    ["subject", [statement.subject[0], statement.subject[0]], "statement.subject-count-invalid"],
    ["subject", null, "statement.subject-count-invalid"],
    ["subject", [null], "statement.subject-invalid"],
  ])("PROV-05 rejects Statement %s=%j", (key, value, code) => {
    expect(() => verify(withStatement(JSON.stringify({ ...statement, [key]: value })))).toThrow(
      expect.objectContaining({ code }),
    );
  });
  it.each([
    "pkg:npm/@windlass/vers-js@0.1.3",
    "pkg:npm/%40other/vers-js@0.1.3",
    "pkg:npm/%40windlass/other@0.1.3",
    "pkg:npm/%40windlass/vers-js@0.1.4",
    123,
  ])("PROV-06 rejects subject %s", (name) => {
    const changed = { ...statement, subject: [{ ...statement.subject[0], name }] };
    expect(() => verify(withStatement(JSON.stringify(changed)))).toThrow(
      expect.objectContaining({ code: "statement.subject-mismatch" }),
    );
  });
  it("PROV-06 accepts an exact unscoped PURL", () => {
    const changed = {
        ...statement,
        subject: [{ ...statement.subject[0], name: "pkg:npm/vers-js@0.1.3" }],
      },
      serialized = JSON.stringify(withStatement(JSON.stringify(changed)));
    expect(() =>
      verifyReleaseProvenance({
        ...expected,
        bundleText: serialized,
        packageName: "vers-js",
      }),
    ).not.toThrow();
  });
  it.each(["sha256", "sha512"])("PROV-07 requires exact %s independently", (algorithm) => {
    for (const value of [undefined, "wrong", 123]) {
      const subject = {
        ...statement.subject[0],
        digest: { ...statement.subject[0].digest, [algorithm]: value },
      };
      expect(() =>
        verify(withStatement(JSON.stringify({ ...statement, subject: [subject] }))),
      ).toThrow(expect.objectContaining({ code: `statement.${algorithm}-mismatch` }));
    }
  });
  it.each([null, [], "digest"])("PROV-07 rejects digest %j", (digest) => {
    const subject = { ...statement.subject[0], digest };
    expect(() =>
      verify(withStatement(JSON.stringify({ ...statement, subject: [subject] }))),
    ).toThrow(expect.objectContaining({ code: "statement.digest-invalid" }));
  });
  it("PROV-08 rejects duplicate Statement members before trusting the last subject", () => {
    const text = readFileSync(
      new URL("fixtures/release/statement-duplicate.json", import.meta.url),
      "utf8",
    );
    expect(JSON.parse(text).subject).toEqual(statement.subject);
    expect(() => verify(withStatement(text))).toThrow(
      expect.objectContaining({ code: "statement.duplicate-member" }),
    );
  });
});

describe("handoff integrity (issue #80)", () => {
  it.each([
    '{"verificationMaterial":{"nested":{"a":1,"a":2}}}',
    '{"dsseEnvelope":{"payload":"a","payload":"b"}}',
  ])("JSON-03 rejects original bundle duplicates", (text) => {
    expect(() => verifyReleaseProvenance({ ...expected, bundleText: text })).toThrow(
      expect.objectContaining({ code: "bundle.duplicate-member" }),
    );
  });
  it("JSON-05 rejects a second bundle record", () => {
    expect(() =>
      verifyReleaseProvenance({ ...expected, bundleText: `${bundleText}\n${bundleText}` }),
    ).toThrow(expect.objectContaining({ code: "bundle.syntax-invalid" }));
  });
  it.each([true, false])("CLI exits correctly for matching digests=%s", (matches) => {
    // Given an isolated handoff file, when the real CLI runs, then its exit status reflects verification.
    const directory = mkdtempSync(path.join(tmpdir(), "vers-provenance-"));
    try {
      writeFileSync(path.join(directory, "package.tgz.intoto.jsonl"), bundleText);
      const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL("../scripts/verify-release-provenance.mjs", import.meta.url))],
        {
          cwd: directory,
          encoding: "utf8",
          env: {
            ...process.env,
            EXPECTED_SHA256: matches ? expected.expectedSha256 : "wrong",
            EXPECTED_SHA512: expected.expectedSha512,
            PACKAGE_NAME: expected.packageName,
            PACKAGE_VERSION: expected.packageVersion,
            TARBALL_NAME: "package.tgz",
          },
        },
      );
      expect(result.status).toBe(matches ? 0 : 1);
      if (matches) {
        expect(result.stdout.length).toBeGreaterThan(0);
      }
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("CLI rejects malformed UTF-8 bytes in an unchecked bundle field", () => {
    // The unchecked verificationMaterial member carries invalid UTF-8 bytes.
    // The CLI must fail rather than accept a lossy U+FFFD replacement.
    const directory = mkdtempSync(path.join(tmpdir(), "vers-provenance-"));
    try {
      writePoisonedBundle(directory);
      const result = runCli(directory);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("bundle.utf8-invalid");
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
