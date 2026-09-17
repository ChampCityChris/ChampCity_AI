# ChampCity A/I Desktop Release Process

## Release invariant

A published ChampCity A/I Desktop installer must be produced from and traceable to the exact tagged source revision. Do not combine an installer from one working tree with a tag, release note, or checksum from another.

The governing sequence is:

```text
accepted source baseline
  -> current documentation/governance
  -> release validation
  -> build canonical installer from the exact source revision
  -> commit/push exact source
  -> tag exact revision
  -> create GitHub Release
  -> attach matching installer
  -> publish SHA-256 and release notes
```

A Work Card does not itself grant permission to commit, push, tag, create a release, or publish assets. Each Git and release action requires explicit Operator authority.

## Bounded MCP release mechanics

The public `release_toolbox` MCP provider may perform only the fixed release operations documented here against the exact registered repository root. It is an execution façade, not an approval system, and it does not accept raw commands, executables, arguments, working directories, environment overrides, shell fragments, or provider credentials.

Its read-scoped actions are `status`, `inspect_release_artifact`, and `verify_github_release`. Its write-scoped actions are `set_version`, `validate_candidate`, `build_windows_release`, and `publish_github_release`. Validation and packaging use fixed command sequences with `shell: false`, bounded output, fixed deadlines, and attributable receipts. Installer hashing is performed in the Desktop Node process and is limited to the canonical installer derived from the current package version.

On Windows, npm-backed release operations require a standalone Node/npm installation. ChampCity resolves a directly executable `node.exe` and the bounded `node_modules/npm/bin/npm-cli.js` entry from the same fixed installation root, verifies that the executable identifies as standalone Node rather than Electron, and fails closed with `RELEASE_PREREQUISITE_UNAVAILABLE` when that pair is unavailable. It does not use the hosting ChampCity/Electron executable, `npm.cmd`, a command shell, or caller-selected runtime paths.

Because full candidate validation can outlast an external connector response window, the existing read-only `release_toolbox.status` action returns the latest completed validation snapshot for that registered repository. The bounded snapshot includes its application-generated validation ID, start/completion timestamps, final pass/fail result, and safe public command receipts; it does not expose the resolved local Node/npm paths. This permits recovery of an attributable result after a gateway timeout without adding a raw command or changing the `validate_candidate` input schema.

Git branch, commit, push, and tag mechanics remain the exclusive responsibility of `git_toolbox`. `release_toolbox.publish_github_release` never creates or pushes a tag: it fails closed unless the exact `v<packageVersion>` tag exists locally at current `HEAD` and the same target exists on `origin`. GitHub publication uses the installed, authenticated `gh` CLI, uploads only the canonical installer, reads only the canonical release-notes file, and refuses to alter an existing release. Post-publication verification downloads the canonical asset to an OS temporary directory, compares it with the local installer by SHA-256, and removes the temporary download on success or failure.

## 1. Establish the release candidate

1. Begin from the Operator-approved Desktop source baseline.
2. Confirm the intended version in `package.json` and `package-lock.json` and the expected artifact name `ChampCityAI-Setup-<version>.exe`.
3. Confirm current product, user, architecture, development, governance, and release documentation matches the candidate.
4. Confirm the working tree contains only intended release changes and no secrets, `.env` files, local paths, local archives, screenshots, generated junk, or unrelated user work.
5. Record the exact candidate source identity used for the build. The eventual release commit and tag must contain that identical source/configuration tree.

Do not restore archived planning records or generated output to make the release appear complete.

## 2. Run release validation

Read [Validation Command Lanes](../dev/VALIDATION_COMMAND_LANES.md), then use the approved normal Windows lane:

```powershell
npm ci
npm run typecheck
npm run build
npm test
git diff --check
git status --short
```

Record exact exit results and relevant test counts. A restricted-lane `spawn EPERM` is not a pass; rerun once in the approved normal Windows lane. Resolve or explicitly block on source failures.

Complete the Operator validation required by the release card. Implementer automation and a launch smoke cannot substitute for human workflow or usability acceptance.

## 3. Build and validate the Windows artifacts

From the exact accepted source candidate:

```powershell
npm run package:win:dir
npm run package:win
npm run validate:package:win
```

Expected canonical artifacts are:

```text
release/win-unpacked/ChampCityAI.exe
release/ChampCityAI-Setup-<version>.exe
```

The metadata validator requires both and checks the `ChampCity A/I` Windows identity and canonical filenames. Also perform the release card's bounded install/current-user/everyone/uninstall smoke checks when they are in the current release task scope.

The current installer is unsigned. Release notes must state that Windows may show Unknown Publisher or SmartScreen and must direct users to verify the SHA-256. Do not imply code-signing validation occurred.

## 4. Create the exact source revision

Only with explicit Operator direction for Git:

1. stage exactly the source, configuration, documentation, and approved report/evidence files that formed the installer build;
2. inspect the staged diff and repeat the secret/local-path/generated-artifact safety scan;
3. create the release commit using the approved message;
4. verify the commit tree matches the recorded build candidate with no source/configuration change;
5. push that exact commit to the approved remote branch.

If any release-affecting file changes after the installer build, discard the candidate artifact from release consideration, repeat validation, and rebuild from the new exact revision.

## 5. Tag the revision

Only after the exact source commit is pushed and reviewed:

1. create the approved version tag on that commit;
2. verify the tag resolves to the intended full commit hash;
3. push the tag without moving or recreating it.

The tag is the source identity for the release. Never tag a different commit merely because its version string matches.

## 6. Hash and publish

Compute the installer hash without modifying it:

```powershell
Get-FileHash -Algorithm SHA256 .\release\ChampCityAI-Setup-<version>.exe
```

Create the GitHub Release from the exact tag. Attach only the validated `ChampCityAI-Setup-<version>.exe` built from that revision. Publish:

- the full tag and commit identity;
- the exact installer filename;
- the complete SHA-256;
- concise release notes covering implemented behavior, compatibility, known limitations, install/update notes, data preservation, and any Operator-approved migration;
- the unsigned-publisher expectation until signing is configured.

Do not publish `win-unpacked`, local logs, user data, credentials, development screenshots, or an installer from an earlier build.

## 7. Post-publication verification

1. Download the attached installer from the release page.
2. verify its filename, byte-for-byte SHA-256, and release tag/commit linkage;
3. confirm the release notes identify the same version and limitations;
4. record the release URL, tag, commit hash, installer hash, validation results, and any remaining Operator observations in the release evidence required by the active card.

If the uploaded asset differs, remove it from release availability and correct the release under explicit Operator authority. Do not silently replace a published binary while leaving the old checksum or tag identity.
