# Implementer Literal Compliance Protocol

## Governing Rule

The Implementer must satisfy each Work Card requirement and prohibition literally. It may not replace the specified architecture with a mechanism it considers equivalent, safer, more compatible, easier to test, or less disruptive.

A successful route, build, or test suite does not satisfy a requirement while a prohibited mechanism remains in production.

## Implementation Modes

### Ordinary implementation

Preserve behavior and structure only where the Work Card does not require replacement.

### Replacement mode

Replacement mode applies when the Work Card replaces an architecture, authority path, schema, subsystem boundary, or runtime mechanism.

In replacement mode:

- deletion is preferred over wrapping;
- superseded runtime authority must be removed;
- missing new-schema fields must block;
- production code must not read legacy aliases or infer absent fields;
- migration logic must remain offline and physically separated from runtime code;
- a dual-read or fallback period is prohibited unless explicitly authorized;
- old tests do not define the target architecture.

## Acceptance Contract

Each material Work Card must have a machine-readable Acceptance Contract. Every requirement has:

- a stable requirement ID;
- requirement type;
- literal statement;
- assigned Execution Pass IDs;
- prohibited substitutions, when applicable;
- required behavioral or contradiction tests.

The Implementer Report and pass result must map each assigned requirement ID to exact production evidence, tests, commands, and observed results.

## Deletion And Replacement Manifest

Before editing replacement-mode code, produce an inventory of:

- authority that must be deleted;
- authority that must be replaced;
- behavior that must remain absent;
- migration-only readers that must not be imported at runtime;
- tests that preserve valid product behavior;
- tests that encode superseded architecture and must be replaced.

The final pass reconciles every manifest item.

## Tests

Implementer-authored tests must include positive and negative behavior. Prohibitions require contradiction tests, not only syntax searches.

Examples:

- opaque IDs work when explicit type is correct;
- misleading IDs do not override explicit type;
- missing mandatory fields block;
- unknown actions cannot reach a normal screen;
- wrong-revision approval cannot authorize execution;
- multiple active authorities block rather than rank or guess.

Existing tests may be modified only when the Implementer classifies them as preserved product behavior, obsolete architecture, or new acceptance evidence.

## Reporting

Narrative claims are insufficient. Each material claim must cite:

- production file and symbol;
- test file and test name;
- command and execution lane;
- observed result;
- negative evidence where absence is required.

A materially unsupported or contradicted completion claim invalidates the report.

## Stop Conditions

Stop only for a genuine authority contradiction, scope expansion, destructive operation requiring approval, unavailable required capability, or unresolved governance ambiguity.

Large scope, difficult deletion, failing tests, or compatibility breakage required by the approved replacement are not stop conditions.
