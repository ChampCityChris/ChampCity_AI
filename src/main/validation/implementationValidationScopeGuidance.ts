export type ImplementationValidationContractKind = "work-card" | "fix-card";

const contractNouns: Record<ImplementationValidationContractKind, "Work Card" | "Fix Card"> = {
  "work-card": "Work Card",
  "fix-card": "Fix Card",
};

const implementationValidationScopeRuleTemplates = [
  "- Tests are evidence of the {contractNoun} objective, not an independent product decision.",
  "- Select validation at the smallest practical boundary relevant to the behavior owned by this {contractNoun}.",
  "- Do not make an entire multi-domain test file or broad suite an all-or-nothing acceptance gate unless this {contractNoun} actually owns all behavior exercised by that file or suite.",
  "- When practical, prefer dedicated focused tests, relevant named test cases, or a focused lane whose assertions map to this {contractNoun} objective.",
  "- Full-suite or broad integration cleanliness belongs only to a {contractNoun} that explicitly owns integration or baseline validation.",
  "- If a shared validation lane discovers a demonstrated unrelated or pre-existing failure, require the Implementer to record it and route it to the appropriate owner instead of automatically attributing it to this {contractNoun}.",
  "- Unexplained failures that may affect this {contractNoun} objective still require classification and cannot be ignored.",
] as const;

const workCardCoverageGovernanceRules = [
  "- Before creating permanent automated proof, inspect the existing tests and validation/capability-map.json for the affected behavior.",
  "- Prefer, in order: reuse an existing test unchanged; modify or extend an existing test at the same stable behavior or proof boundary; consolidate overlapping or redundant proof only when this Work Card explicitly authorizes it and preserves or improves regression protection; create a new permanent test only for a materially distinct uncovered behavior, boundary condition, regression, failure mode, contract, or risk.",
  "- A production-code change does not by itself require a new test, successful Work Card completion does not require test-count growth, and test quantity is not an acceptance criterion.",
  "- Require a specific coverage-gap justification for every new permanent test.",
  "- Require the Implementer Report to distinguish: existing tests reused unchanged; existing tests modified or extended; tests consolidated when explicitly authorized; tests retired when explicitly authorized; and new permanent tests added with the specific previously uncovered behavior, boundary, regression, failure mode, contract, or risk that justified each addition.",
] as const;

export function buildImplementationValidationScopeGuidance(
  contractKind: ImplementationValidationContractKind,
): string[] {
  const contractNoun = contractNouns[contractKind];
  return [
    "Validation evidence guidance:",
    ...implementationValidationScopeRuleTemplates.map((rule) =>
      rule.replaceAll("{contractNoun}", contractNoun),
    ),
    ...(contractKind === "work-card" ? workCardCoverageGovernanceRules : []),
    "",
  ];
}
