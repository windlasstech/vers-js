import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { parseStrictJson } from "./strict-json.mjs";

class ProvenanceError extends Error {
  constructor(code, cause) {
    super(code, { cause });
    this.name = "ProvenanceError";
    this.code = code;
  }
}

function requireCondition(condition, code) {
  if (!condition) {
    throw new ProvenanceError(code);
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseDocument(text, scope) {
  try {
    return parseStrictJson(text);
  } catch (error) {
    if (
      error instanceof Error &&
      typeof error.code === "string" &&
      error.code.startsWith("json.")
    ) {
      throw new ProvenanceError(`${scope}.${error.code.slice("json.".length)}`, error);
    }
    throw error;
  }
}

function decodeStatement(payload) {
  requireCondition(typeof payload === "string" && payload.length > 0, "bundle.payload-invalid");
  const bytes = Buffer.from(payload, "base64");
  requireCondition(bytes.toString("base64") === payload, "bundle.payload-invalid");
  try {
    // Preserve a BOM as input rather than silently removing it from signed bytes.
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    return parseDocument(text, "statement");
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ProvenanceError("statement.utf8-invalid", error);
    }
    throw error;
  }
}

function checkSignatures(signatures) {
  requireCondition(
    Array.isArray(signatures) && signatures.length === 1,
    "bundle.signatures-invalid",
  );
  const [signature] = signatures;
  requireCondition(
    isObject(signature) && typeof signature.sig === "string" && signature.sig.length > 0,
    "bundle.signatures-invalid",
  );
}

function readEnvelope(bundle) {
  requireCondition(isObject(bundle), "bundle.object-invalid");
  requireCondition(!Object.hasOwn(bundle, "payload"), "bundle.legacy-payload");
  requireCondition(
    !Object.hasOwn(bundle, "messageSignature"),
    "bundle.message-signature-unsupported",
  );
  requireCondition(
    bundle.mediaType === "application/vnd.dev.sigstore.bundle.v0.3+json",
    "bundle.media-type-invalid",
  );
  requireCondition(isObject(bundle.verificationMaterial), "bundle.verification-material-invalid");
  const envelope = bundle.dsseEnvelope;
  requireCondition(isObject(envelope), "bundle.envelope-invalid");
  requireCondition(
    envelope.payloadType === "application/vnd.in-toto+json",
    "bundle.payload-type-invalid",
  );
  checkSignatures(envelope.signatures);
  return envelope;
}

function readSubject(statement) {
  requireCondition(isObject(statement), "statement.object-invalid");
  const { _type: statementType } = statement;
  requireCondition(statementType === "https://in-toto.io/Statement/v1", "statement.type-invalid");
  requireCondition(
    statement.predicateType === "https://slsa.dev/provenance/v1",
    "statement.predicate-type-invalid",
  );
  requireCondition(
    Array.isArray(statement.subject) && statement.subject.length === 1,
    "statement.subject-count-invalid",
  );
  const [subject] = statement.subject;
  requireCondition(isObject(subject), "statement.subject-invalid");
  return subject;
}

// Structural and subject/digest verification only.
// Cryptographic signature and signer-identity verification belong to the workflow.
function verifyReleaseProvenance({
  bundleText,
  packageName,
  packageVersion,
  expectedSha256,
  expectedSha512,
}) {
  const bundle = parseDocument(bundleText, "bundle"),
    envelope = readEnvelope(bundle),
    subject = readSubject(decodeStatement(envelope.payload));
  requireCondition(
    typeof packageName === "string" &&
      packageName.length > 0 &&
      typeof packageVersion === "string" &&
      packageVersion.length > 0,
    "expected.package-invalid",
  );
  const purlName = packageName.startsWith("@") ? `%40${packageName.slice(1)}` : packageName,
    expectedName = `pkg:npm/${purlName}@${packageVersion}`;
  requireCondition(subject.name === expectedName, "statement.subject-mismatch");
  requireCondition(isObject(subject.digest), "statement.digest-invalid");
  requireCondition(
    typeof subject.digest.sha256 === "string" && subject.digest.sha256 === expectedSha256,
    "statement.sha256-mismatch",
  );
  requireCondition(
    typeof subject.digest.sha512 === "string" && subject.digest.sha512 === expectedSha512,
    "statement.sha512-mismatch",
  );
}

function main() {
  const { TARBALL_NAME, PACKAGE_NAME, PACKAGE_VERSION, EXPECTED_SHA256, EXPECTED_SHA512 } =
    process.env;
  requireCondition(
    typeof TARBALL_NAME === "string" && TARBALL_NAME.length > 0,
    "expected.tarball-invalid",
  );
  verifyReleaseProvenance({
    bundleText: readFileSync(`${TARBALL_NAME}.intoto.jsonl`, "utf8"),
    expectedSha256: EXPECTED_SHA256,
    expectedSha512: EXPECTED_SHA512,
    packageName: PACKAGE_NAME,
    packageVersion: PACKAGE_VERSION,
  });
  console.log("Provenance bundle structure and release digests verified.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { verifyReleaseProvenance };
