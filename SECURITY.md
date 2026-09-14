# Security Policy

## Supported versions

ChampCity A/I is currently in beta. Security fixes are provided for the latest public beta release and the current maintained development line.

| Version | Security support |
| --- | --- |
| Latest public `0.1.x` beta | Supported |
| Current maintained development line | Supported |
| Older prerelease builds and historical snapshots | Not supported |

When a security fix requires changes that are not practical to backport, the fix may be delivered only in the newest beta or development release.

## Reporting a vulnerability

Do **not** report security vulnerabilities through a public GitHub Issue, Discussion, pull request, or other public channel.

Preferred reporting path:

1. Open this repository on GitHub.
2. Open the **Security** area.
3. Use **Report a vulnerability** to submit a private vulnerability report.

If private vulnerability reporting is not available, do not post exploit details publicly. Open a minimal GitHub Issue stating only that you need a private channel to report a security concern; do not include reproduction steps, secrets, exploit code, affected paths, or other sensitive technical detail in that public issue.

Please include, where possible:

- the affected ChampCity A/I version or commit;
- the operating environment;
- the security boundary affected;
- clear reproduction steps;
- expected versus observed behavior;
- impact assessment;
- any proof-of-concept material needed to establish the issue;
- whether you believe credentials, user files, repositories, or remote systems may be exposed.

## Security-sensitive areas

Examples of issues that should be reported privately include:

- repository-containment or workspace-authority bypasses;
- arbitrary file read/write outside the selected repository;
- MCP authentication, OAuth, or authorization bypasses;
- unintended public-network exposure of local services;
- remote or local code execution outside the intended execution boundary;
- command-injection or unsafe child-process behavior;
- privilege or installer-scope escalation;
- credential, token, cookie, or secret disclosure;
- unsafe Background Agent or Service Host lifecycle behavior;
- sandbox, preload, IPC, or Electron trust-boundary bypasses;
- dependency or update behavior that allows untrusted executable substitution.

Ordinary functional defects, UI problems, performance regressions, and feature requests should use normal GitHub Issues unless they create a security impact.

## Disclosure and response

Please allow reasonable time to reproduce, assess, and correct a reported vulnerability before public disclosure. Receipt of a report does not create a support contract, service-level agreement, bounty entitlement, or guarantee of a particular remediation timeline.

Security fixes may be coordinated through a GitHub Security Advisory when appropriate. Public disclosure should occur only after a fix or adequate mitigation is available, unless earlier disclosure is legally required.

## Scope and warranty

This policy applies to ChampCity A/I code and release artifacts maintained in this repository. Third-party services, model providers, operating-system components, and dependencies are governed by their respective security processes, although vulnerabilities in ChampCity's integration with them remain in scope here.

ChampCity A/I remains subject to the warranty and liability terms of its applicable license.
