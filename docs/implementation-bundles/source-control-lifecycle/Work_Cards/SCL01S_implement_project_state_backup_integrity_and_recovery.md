# SCL01S — Implement Project State Backup, Integrity, and Recovery

**Depends on:** SCL01R  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01S_IMPLEMENTER_REPORT.md`

## Objective

Make SQLite Project State recoverable before it becomes canonical authority.

## Required Changes

1. Implement application-owned online backup through the SQLite adapter.
2. Verify backups with schema + integrity checks.
3. Implement bounded retention metadata/policy.
4. Restore only into isolated candidate storage first.
5. Verify candidate schema/integrity and Project identities before selecting it.
6. Record recovery/backup evidence and reject casual copying of a live main DB file without WAL-aware procedure.

## Acceptance Criteria

Backup/restore round-trip preserves canonical records/history/relationships/audit and cannot silently replace live authority with an unverified file.

## Validation

Backup/corruption/recovery fixtures + applicable migration lane + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01T.
