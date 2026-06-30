import type { WorkCard, WorkCardRiskLevel } from "./workCardSchema";
import { validateWorkCard } from "./validateWorkCard";

export interface RiskFlag {
  category: string;
  severity: WorkCardRiskLevel;
  matchedTerms: string[];
  rationale: string;
  suggestedArchitectQuestion: string;
}

export interface WorkCardRiskReview {
  workCardId: string;
  title: string;
  phase: string;
  assessedRiskLevel: WorkCardRiskLevel;
  flaggedCategories: RiskFlag[];
  scopeCreepSignals: string[];
  architectReviewQuestions: string[];
  summary: string;
}

interface RiskTerm {
  label: string;
  pattern: RegExp;
}

interface RiskCategoryRule {
  category: string;
  severity: WorkCardRiskLevel;
  terms: RiskTerm[];
  rationale: string;
  suggestedArchitectQuestion: string;
}

interface ScopeCreepRule {
  label: string;
  terms: RiskTerm[];
}

const searchableFields = [
  "problem",
  "goal",
  "userOutcome",
  "scope",
  "outOfScope",
  "requirements",
  "acceptanceCriteria",
  "validationPlan",
  "risks",
  "builderInstructions",
  "operatorNotes",
] as const satisfies readonly (keyof WorkCard)[];

const highRiskCategoryRules: RiskCategoryRule[] = [
  {
    category: "Secrets or credentials",
    severity: "high",
    terms: [
      word("secret"),
      word("secrets"),
      word("credential"),
      word("credentials"),
      phrase("api key"),
      word("token"),
      word("password"),
      phrase("private key"),
      phrase(".env"),
    ],
    rationale:
      "The Work Card mentions secrets, credentials, tokens, passwords, or similar private values.",
    suggestedArchitectQuestion:
      "Does this Work Card need access to secrets or credentials, and can that be avoided?",
  },
  {
    category: "Authentication or authorization",
    severity: "high",
    terms: [
      word("auth"),
      word("authentication"),
      word("authorization"),
      word("login"),
      phrase("sign in"),
      word("signin"),
      word("oauth"),
      word("session"),
      word("permission"),
      word("permissions"),
      word("roles"),
      phrase("access control"),
    ],
    rationale:
      "The Work Card mentions login, permissions, sessions, roles, or related access-control behavior.",
    suggestedArchitectQuestion:
      "Is this asking the Implementer to change authentication or authorization behavior?",
  },
  {
    category: "Filesystem writes outside approved planning paths",
    severity: "high",
    terms: [
      phrase("outside approved planning"),
      phrase("outside planning"),
      phrase("write outside"),
      phrase("writes outside"),
      phrase("arbitrary path"),
      phrase("arbitrary filesystem"),
      phrase("absolute path"),
      phrase("unrestricted filesystem"),
      phrase("home directory"),
      phrase("appdata"),
    ],
    rationale:
      "The Work Card mentions filesystem access patterns that may go beyond approved planning folders.",
    suggestedArchitectQuestion:
      "Should filesystem writes be constrained to planning/phases/<phase-folder>/ only?",
  },
  {
    category: "Database or migration changes",
    severity: "high",
    terms: [
      word("database"),
      word("db"),
      word("migration"),
      word("migrations"),
      word("sql"),
      word("sqlite"),
      word("postgres"),
      word("prisma"),
      word("orm"),
      phrase("schema migration"),
    ],
    rationale:
      "The Work Card mentions database, schema, migration, or persistence-layer changes.",
    suggestedArchitectQuestion:
      "Does this Work Card require database or migration work that should be isolated into a smaller card?",
  },
  {
    category: "Cloud, deployment, or infrastructure changes",
    severity: "high",
    terms: [
      word("cloud"),
      word("deploy"),
      word("deployment"),
      word("infrastructure"),
      word("terraform"),
      word("docker"),
      word("kubernetes"),
      word("aws"),
      word("azure"),
      word("gcp"),
      word("hosting"),
      phrase("ci/cd"),
      phrase("github actions"),
    ],
    rationale:
      "The Work Card mentions deployment, hosting, cloud, infrastructure, or CI/CD work.",
    suggestedArchitectQuestion:
      "Can this be completed without changing cloud, deployment, or infrastructure settings?",
  },
  {
    category: "Payment, billing, or account deletion",
    severity: "high",
    terms: [
      word("payment"),
      word("payments"),
      word("billing"),
      word("stripe"),
      word("invoice"),
      word("subscription"),
      word("refund"),
      phrase("account deletion"),
      phrase("delete account"),
      word("cancellation"),
    ],
    rationale:
      "The Work Card mentions money movement, subscriptions, billing records, refunds, or account deletion.",
    suggestedArchitectQuestion:
      "Is this asking the Implementer to change payment, billing, subscription, or account deletion behavior?",
  },
  {
    category: "External API/provider integration",
    severity: "high",
    terms: [
      phrase("external api"),
      phrase("api integration"),
      phrase("provider integration"),
      phrase("provider integrations"),
      phrase("provider sdk"),
      word("sdk"),
      word("openai"),
      word("anthropic"),
      word("ollama"),
      phrase("lm studio"),
      word("featherless"),
      phrase("http request"),
      phrase("network call"),
      word("webhook"),
      phrase("third-party api"),
    ],
    rationale:
      "The Work Card mentions provider SDKs, external APIs, network calls, or third-party integrations.",
    suggestedArchitectQuestion:
      "Can this be implemented without adding a provider SDK yet?",
  },
  {
    category: "MCP or connector integration",
    severity: "high",
    terms: [
      word("mcp"),
      word("connector"),
      word("connectors"),
      phrase("connector integration"),
      phrase("mcp integration"),
    ],
    rationale:
      "The Work Card mentions MCP or connector integration work.",
    suggestedArchitectQuestion:
      "Should MCP or connector integration stay out of scope for this MVP Work Card?",
  },
  {
    category: "Security policy changes",
    severity: "high",
    terms: [
      phrase("security policy"),
      phrase("permission policy"),
      phrase("content security"),
      word("csp"),
      phrase("threat model"),
      word("vulnerability"),
      phrase("security review"),
    ],
    rationale:
      "The Work Card mentions security policy, content security policy, vulnerabilities, or security review.",
    suggestedArchitectQuestion:
      "Is this asking the Implementer to change a security policy, and does it need a dedicated security review?",
  },
  {
    category: "Destructive Git/GitHub actions",
    severity: "high",
    terms: [
      phrase("git reset"),
      phrase("reset --hard"),
      phrase("force push"),
      phrase("delete branch"),
      phrase("delete tag"),
      phrase("rewrite history"),
      phrase("git clean"),
      phrase("delete repository"),
      phrase("delete repo"),
      phrase("destructive git"),
      phrase("destructive github"),
    ],
    rationale:
      "The Work Card mentions destructive Git or GitHub actions that can remove or rewrite work.",
    suggestedArchitectQuestion:
      "Does this Work Card require destructive Git or GitHub actions, and can that be avoided?",
  },
  {
    category: "Large dependency upgrades or audit fixes",
    severity: "high",
    terms: [
      phrase("dependency upgrade"),
      phrase("dependency upgrades"),
      phrase("upgrade all"),
      phrase("major upgrade"),
      phrase("npm audit fix"),
      phrase("audit fix"),
      phrase("large dependency"),
      phrase("npm update"),
      phrase("upgrade dependencies"),
    ],
    rationale:
      "The Work Card mentions broad dependency upgrades or audit fixes that may change many packages.",
    suggestedArchitectQuestion:
      "Can dependency or audit work be narrowed to the smallest safe package change?",
  },
  {
    category: "Broad refactors",
    severity: "high",
    terms: [
      phrase("broad refactor"),
      phrase("large refactor"),
      phrase("refactor all"),
      word("rewrite"),
      word("rearchitecture"),
      phrase("re-architecture"),
      phrase("redesign architecture"),
      phrase("sweeping refactor"),
    ],
    rationale:
      "The Work Card mentions a broad refactor, rewrite, or architecture-level change.",
    suggestedArchitectQuestion:
      "Can this be split into a narrower Work Card instead of a broad refactor?",
  },
];

const scopeCreepRules: ScopeCreepRule[] = [
  {
    label: "UI redesign",
    terms: [
      phrase("ui redesign"),
      phrase("visual redesign"),
      phrase("figma-quality"),
      phrase("broad ui"),
      phrase("app shell redesign"),
    ],
  },
  {
    label: "database",
    terms: [word("database"), word("db"), word("sql"), word("sqlite")],
  },
  {
    label: "authentication",
    terms: [word("auth"), word("authentication"), word("authorization")],
  },
  {
    label: "deployment",
    terms: [word("deploy"), word("deployment"), word("hosting")],
  },
  {
    label: "cloud",
    terms: [word("cloud"), word("aws"), word("azure"), word("gcp")],
  },
  {
    label: "provider integration",
    terms: [
      phrase("provider integration"),
      phrase("provider integrations"),
      phrase("provider sdk"),
      phrase("external api"),
      phrase("api integration"),
    ],
  },
  {
    label: "MCP/connector integration",
    terms: [word("mcp"), word("connector"), word("connectors")],
  },
  {
    label: "broad refactor",
    terms: [
      phrase("broad refactor"),
      phrase("large refactor"),
      word("rewrite"),
      phrase("sweeping refactor"),
    ],
  },
  {
    label: "migration",
    terms: [word("migration"), word("migrations"), phrase("schema migration")],
  },
  {
    label: "security policy",
    terms: [phrase("security policy"), phrase("content security"), word("csp")],
  },
  {
    label: "payment/billing",
    terms: [word("payment"), word("billing"), word("stripe")],
  },
];

const lowRiskTerms = [
  phrase("documentation-only"),
  word("documentation"),
  word("docs"),
  word("markdown"),
  phrase("builder report"),
  phrase("implementer report"),
  phrase("prompt wording"),
  phrase("planning note"),
  phrase("report update"),
  phrase("copy edit"),
  phrase("governance update"),
];

const implementationTerms = [
  word("implement"),
  word("implementation"),
  word("ui"),
  word("renderer"),
  word("electron"),
  word("react"),
  word("ipc"),
  word("typescript"),
  word("script"),
  word("validation"),
  word("test"),
  word("source"),
  phrase("main process"),
  phrase("preload"),
  phrase("file store"),
  phrase("file-store"),
];

export function routeWorkCardRisk(workCard: WorkCard): WorkCardRiskReview {
  const validation = validateWorkCard(workCard);

  if (!validation.valid) {
    throw new Error(
      `Cannot route risk for invalid Work Card: ${validation.errors.join("; ")}`,
    );
  }

  const searchableText = collectSearchableText(workCard);
  const flaggedCategories = highRiskCategoryRules
    .map((rule) => toRiskFlag(rule, searchableText))
    .filter((flag): flag is RiskFlag => flag !== null);
  const scopeCreepSignals = detectScopeCreepSignals(searchableText);
  const assessedRiskLevel = assessRiskLevel(
    searchableText,
    flaggedCategories,
  );
  const architectReviewQuestions = unique([
    ...flaggedCategories.map((flag) => flag.suggestedArchitectQuestion),
    ...scopeCreepSignals.map(
      () => "Should this be split into a smaller Work Card before Implementer handoff?",
    ),
  ]);

  return {
    workCardId: workCard.workCardId,
    title: workCard.title,
    phase: workCard.phase,
    assessedRiskLevel,
    flaggedCategories,
    scopeCreepSignals,
    architectReviewQuestions,
    summary: buildSummary(assessedRiskLevel, flaggedCategories.length),
  };
}

function collectSearchableText(workCard: WorkCard): string {
  return searchableFields
    .map((field) => {
      const value = workCard[field];
      return Array.isArray(value) ? value.join("\n") : value;
    })
    .join("\n")
    .toLowerCase();
}

function toRiskFlag(
  rule: RiskCategoryRule,
  searchableText: string,
): RiskFlag | null {
  const matchedTerms = unique(
    rule.terms
      .filter((term) => term.pattern.test(searchableText))
      .map((term) => term.label),
  );

  if (matchedTerms.length === 0) {
    return null;
  }

  return {
    category: rule.category,
    severity: rule.severity,
    matchedTerms,
    rationale: rule.rationale,
    suggestedArchitectQuestion: rule.suggestedArchitectQuestion,
  };
}

function detectScopeCreepSignals(searchableText: string): string[] {
  const matchedWorkTypes = scopeCreepRules
    .filter((rule) => rule.terms.some((term) => term.pattern.test(searchableText)))
    .map((rule) => rule.label);

  if (matchedWorkTypes.length < 2) {
    return [];
  }

  return [
    `Mentions multiple large work types together: ${matchedWorkTypes.join(", ")}.`,
  ];
}

function assessRiskLevel(
  searchableText: string,
  flaggedCategories: RiskFlag[],
): WorkCardRiskLevel {
  if (flaggedCategories.length > 0) {
    return "high";
  }

  if (isClearlyLowRisk(searchableText)) {
    return "low";
  }

  return "medium";
}

function isClearlyLowRisk(searchableText: string): boolean {
  const hasLowRiskSignal = lowRiskTerms.some((term) =>
    term.pattern.test(searchableText),
  );
  const hasImplementationSignal = implementationTerms.some((term) =>
    term.pattern.test(searchableText),
  );

  return hasLowRiskSignal && !hasImplementationSignal;
}

function buildSummary(
  assessedRiskLevel: WorkCardRiskLevel,
  flaggedCategoryCount: number,
): string {
  if (assessedRiskLevel === "high") {
    return `${flaggedCategoryCount} high-risk category signal${
      flaggedCategoryCount === 1 ? "" : "s"
    } detected. Architect review should resolve the flagged items before Implementer handoff.`;
  }

  if (assessedRiskLevel === "medium") {
    return "No high-risk categories were detected, but this appears to involve implementation, UI, validation, or limited planning-file work. Architect review should confirm the scope before Implementer handoff.";
  }

  return "No major risk flags were detected. Normal Architect review is still required.";
}

function word(label: string): RiskTerm {
  return {
    label,
    pattern: new RegExp(`\\b${escapeRegExp(label)}\\b`, "i"),
  };
}

function phrase(label: string): RiskTerm {
  return {
    label,
    pattern: new RegExp(escapeRegExp(label).replace(/\s+/g, "\\s+"), "i"),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
