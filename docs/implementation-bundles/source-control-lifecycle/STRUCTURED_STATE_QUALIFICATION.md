# Structured Project State qualification at SCL01Z

## Provider boundary

A Project is structured-authoritative only when the live SQLite `project_state_authority` row selects `structured` with a durable generation. Staged imports, shadow reads, and generated Markdown do not select authority. The SCL01Y cutover coordinator verifies exact legacy inventory, importer/schema identity, semantic equivalence, backup, integrity, and a process writer fence before installing that live row. Recovery reads the durable row after an unknown outcome. Administrative rollback requires the exact original legacy snapshot and no structured StateChange after selection.

The staged importer is version 3. It transcribes an explicit legacy Operator route selection with an unidentified legacy Operator identity, preserving the fact that the individual identity was not recorded. The route Decision is linked to its assessment as `derived_from`; equivalence now checks the service's effective current route, not just the presence of route records. Previously staged version 2 candidates require restaging and reverification.

## Qualified structured path

Project, Architect/Planning, Work Intake, Development, Issue, routed Work Item, and Tester semantics have typed ProjectStateService adapters. SQLite restart retains their records, relationships, history, current views, Decisions, Validation freshness, source references, and RegressionObligations. Authoritative agent context and the committed event feed read structured state. A consumer can rebuild a derived index from the event feed without mutating canonical records. `renderView` produces non-authoritative Markdown; it does not accept Markdown edits as state mutations. SCL02 may capture Work Intake through `ProjectStateService.createWorkIntake`.

For a cut-over Project, the V1 canonical writer and the legacy planning snapshot, cached planning context, Work Intake/routing scanners, and Issue state path reject access. Old in-flight callbacks cannot write canonical Markdown after the process fence begins. Architecture, governance, and design Markdown remain normal repository documents outside these workflow-state scanners.

## Remaining legacy compatibility

For Projects still on legacy authority, existing renderer/IPC handlers continue to use the V1 Markdown workflows. The structured adapters are not yet converted into every V1 renderer projection contract; cut-over Projects use structured service entry points, while legacy-only UI actions fail closed rather than treating Markdown as current truth. Later UI migration must adapt those V1 projections before claiming full renderer parity. Source-control preparation and integration behavior remain for SCL02 and later cards.

The package repository itself did not pass live cutover inventory at SCL01Y: 23 canonical documents and 26 metadata conflicts were observed in a read-only inventory. No cutover is eligible for that repository until the conflicts have an evidence-backed resolution and all migration gates are rerun. Synthetic eligible Projects passed the cutover and SCL01Z qualification fixtures.
