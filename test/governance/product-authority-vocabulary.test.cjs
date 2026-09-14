const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const scannedRoots = ["src", "docs"];
const scannedExtensions = new Set([".ts", ".tsx", ".css", ".md"]);
const compatibilityLines = new Map([
  ["src/main/documents/repositoryBinding.ts", new Set([
    'const legacyRepositoryBindingField = "repositoryAuthority";',
  ])],
  ["src/main/issueResolution/issueResolutionService.ts", new Set([
    'const legacyIssueCloseDigestField = "authoritySha256";',
    'const legacyFixCardCompletionBasisField = "completionAuthority";',
    'const legacyCompletedFixCardCloseRecordsHeading = "Completed Fix Card Close Authority";',
    'const legacyExactClosureSourceEvidenceHeading = "Exact Closure Source Authority";',
  ])],
]);

const operatorAuthorityPatterns = [
  /\b(?:the )?(?:human )?Operator is the (?:only|final) authority\b/i,
  /\bOperator's acceptance authority\b/i,
  /\bthe human authority who\b/i,
  /\bexplicit Operator authority\b/i,
  /\bfinal authority remains with the Operator\b/i,
  /\bauthority(?:, which)? remains with the human Operator\b/i,
  /^(?:#+\s*)?Operator authority(?: and task scope|, task scope, and MCP)?(?::)?$/i,
  /^Operator authority and task scope:$/i,
];

const accessAuthorizationPatterns = [
  /\bOAuth authorization\b/i,
  /\bMCP OAuth authorizes a registered client\b/i,
  /\bAuthorization Code\b/i,
  /\bauthorization codes?\b/i,
  /\bauthorization_code\b/i,
  /\b(?:issue|exchange)AuthorizationCode\b/,
  /\bvalidateOAuthAuthorizationRequest\b/,
  /\bAUTHORIZATION_CODE_SECONDS\b/,
  /\/oauth\/authorize\b/i,
  /\boauth-authorization-server\b/i,
  /\bauthorization_(?:endpoint|servers)\b/i,
  /\bheaders?\.authorization\b/i,
  /\bauthorizationPrincipal\b/i,
  /\bfiles(?:Read|Write)TransportAuthorized\b/,
  /\bactiveFiles(?:Read|Write)AuthorizationCount\b/,
  /\bauthorized (?:MCP (?:tools|flow|client)|client)\b/i,
  /\bwrite-authorized MCP session\b/i,
  /\bsigning into ChatGPT authorizes the website session\b/i,
  /\buser authorization\b/i,
  /\bauthorization state\b/i,
  /\bauthorization counts\b/i,
  /\bauthorization consequences\b/i,
  /\berror:\s*["']Unauthorized["']/i,
  /token\|secret\|password[^\n]*authorization/i,
];

const operatorAuthorizationPatterns = [
  /^(?:[-*]\s+)?(?:the )?(?:human )?Operator (?:explicitly )?authoriz(?:e|es|ed|ing)\b/i,
  /\bOperator approval authoriz(?:e|es|ed|ing)\b/i,
];

test("active product source and current docs reserve authority and permission vocabulary for valid principals", () => {
  const findings = [];
  const files = [
    ...scannedRoots.flatMap((root) => collectFiles(path.join(repositoryRoot, root))),
    path.join(repositoryRoot, "AGENTS.md"),
  ];

  for (const absolutePath of files) {
    const relativePath = normalize(path.relative(repositoryRoot, absolutePath));
    assert.doesNotMatch(relativePath, /authorit/i, `active product path uses false-authority vocabulary: ${relativePath}`);
    const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (isAllowedVocabularyLine(relativePath, line)) return;
      findings.push(`${relativePath}:${index + 1}: ${line.trim()}`);
    });
  }

  assert.deepEqual(findings, [], `false product authority/authorization vocabulary found:\n${findings.join("\n")}`);
});

test("vocabulary classifier rejects nonhuman permission principals", () => {
  for (const line of [
    "RevisionRequested validation authorizes Issue Repair.",
    "Current workflow state does not authorize disposition.",
    "## Authorized Surface",
    "The Work Card provides authorization for Git mutation.",
    "The validation record has Operator authority.",
  ]) {
    assert.equal(isAllowedVocabularyLine("src/main/example.ts", line), false, line);
  }
});

test("vocabulary classifier permits Operator authority, access-control terms, and exact legacy literals", () => {
  for (const line of [
    "The human Operator is the only authority.",
    "Operator authorizes release publication.",
    "OAuth authorization uses Authorization Code with PKCE.",
    "An authorized MCP client receives the files.read scope.",
    "const auth = req.headers.authorization;",
  ]) {
    assert.equal(isAllowedVocabularyLine("src/main/example.ts", line), true, line);
  }
  assert.equal(
    isAllowedVocabularyLine(
      "src/main/documents/repositoryBinding.ts",
      'const legacyRepositoryBindingField = "repositoryAuthority";',
    ),
    true,
  );
});

function isAllowedVocabularyLine(relativePath, line) {
  const hasAuthorityNoun = /authorit/i.test(line);
  const hasAuthorizationTerm = /authoriz/i.test(line);
  if (!hasAuthorityNoun && !hasAuthorizationTerm) return true;

  const allowedCompatibility = compatibilityLines.get(relativePath) ?? new Set();
  if (allowedCompatibility.has(line.trim())) return true;
  if (hasAuthorityNoun && !vocabularyOccurrencesCovered(line, /authorit[a-z]*/gi, operatorAuthorityPatterns)) return false;
  if (hasAuthorizationTerm && !vocabularyOccurrencesCovered(
    line,
    /authoriz[a-z-]*/gi,
    [...operatorAuthorizationPatterns, ...accessAuthorizationPatterns],
  )) return false;
  return true;
}

function vocabularyOccurrencesCovered(line, vocabularyPattern, allowedPatterns) {
  const allowedSpans = allowedPatterns.flatMap((pattern) => {
    const flags = `${pattern.flags.replaceAll("g", "")}g`;
    return [...line.matchAll(new RegExp(pattern.source, flags))]
      .map((match) => [match.index, match.index + match[0].length]);
  });
  return [...line.matchAll(vocabularyPattern)].every((match) =>
    allowedSpans.some(([start, end]) => match.index >= start && match.index + match[0].length <= end),
  );
}

function collectFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(candidate);
    return scannedExtensions.has(path.extname(entry.name)) ? [candidate] : [];
  });
}

function normalize(value) {
  return value.replace(/\\/g, "/");
}
