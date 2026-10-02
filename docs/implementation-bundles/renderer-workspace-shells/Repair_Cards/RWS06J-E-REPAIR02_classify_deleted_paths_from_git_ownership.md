# RWS06J-E-REPAIR02 — Classify deleted paths from Git ownership

Status: IMPLEMENTER_READY. Bounded qualification repair required by RWS06J-E; execute continuously and checkpoint before final E.

Defect: final exact A–E manifest cannot be planned after obsolete catalog source patterns are removed. Current planner rejects retired Issue source and three deleted fixtures despite their committed owners. Keeping deleted explicit paths solely for classification violates E-REPAIR01.

Scope: scripts/validation/affected.cjs and planner.cjs; extend existing affected selection proof in validation-runner.test.cjs. For absent otherwise-unclassified paths, verify that Git contains the absent path or its deletion, then consult bounded committed catalog history for its last owner still present in the current catalog (including successor ownership recorded at a deletion checkpoint). Map only to still-existing current capabilities and select their current proof. Record historical ownership reason. Existing and unknown paths remain fail-closed. No current catalog resurrection, runtime workflow change, dependency or authority change. Use bounded read-only Git calls; no secret or filesystem write outside temporary fixtures.

Proof: synthetic Git repository covers unstaged and committed deletion with ownership removed from current map, deterministic current-proof selection, and rejection of never-owned absent or existing unknown paths. Final exact A–E planner preview and validation runner pass. Report at Implementer_Reports/RWS06J-E-REPAIR02_IMPLEMENTER_REPORT.md. Checkpoint `RWS06J-E-R02 classify retired paths from Git ownership`; immediately continue E affected qualification.
