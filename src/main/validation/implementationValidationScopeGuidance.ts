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

export function buildImplementationValidationScopeGuidance(
  contractKind: ImplementationValidationContractKind,
): string[] {
  const contractNoun = contractNouns[contractKind];
  return [
    "Validation evidence guidance:",
    ...implementationValidationScopeRuleTemplates.map((rule) =>
      rule.replaceAll("{contractNoun}", contractNoun),
    ),
    "",
  ];
}
