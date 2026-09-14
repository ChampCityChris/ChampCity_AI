const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const builderConfig = fs.readFileSync(
  path.join(repositoryRoot, "electron-builder.yml"),
  "utf8",
);
const installer = fs.readFileSync(
  path.join(repositoryRoot, "packaging/windows/installer.nsh"),
  "utf8",
);

test("assisted installer exposes both scopes with current-user default, elevation, and destination selection", () => {
  assert.match(builderConfig, /^\s+oneClick: false$/m);
  assert.match(builderConfig, /^\s+perMachine: false$/m);
  assert.match(builderConfig, /^\s+selectPerMachineByDefault: false$/m);
  assert.match(builderConfig, /^\s+allowElevation: true$/m);
  assert.match(builderConfig, /^\s+allowToChangeInstallationDirectory: true$/m);
  assert.doesNotMatch(installer, /!macro\s+customInstallMode|isForceCurrentInstall/);
});

test("installer writes and reads back the exact scope metadata schema from Builder-owned install mode", () => {
  assert.match(installer, /StrCpy \$ChampCityResolvedInstallMode "\$installMode"/);
  assert.match(installer, /\$ChampCityResolvedInstallMode == "all"/);
  for (const scope of ["current-user", "all-users"]) {
    for (const defaultValue of ["true", "false"]) {
      assert.match(
        installer,
        new RegExp(`\\{"schemaVersion":1,"installScope":"${scope}","backgroundAgentLaunchAtLoginDefault":${defaultValue}\\}`),
      );
    }
  }
  assert.match(installer, /FileOpen \$1 "\$INSTDIR\\resources\\\$\{CHAMPCITY_INSTALL_SCOPE_METADATA_FILENAME\}" w/);
  assert.match(installer, /FileWrite \$1 "\$0\$\\r\$\\n"/);
  assert.match(installer, /FileWrite \$1 "\$0\$\\r\$\\n"[\s\S]*FileClose \$1/);
  assert.match(installer, /FileOpen \$1 "\$INSTDIR\\resources\\\$\{CHAMPCITY_INSTALL_SCOPE_METADATA_FILENAME\}" r/);
  assert.match(installer, /\$ChampCityInstalledScopeWriteResult != "ok"[\s\S]*SetErrorLevel 30[\s\S]*Abort/);
});

test("all-users install owns one exact quoted x64 machine trigger while current-user delegates to application registration", () => {
  assert.match(installer, /SetRegView 64/);
  assert.match(installer, /Software\\Microsoft\\Windows\\CurrentVersion\\Run/);
  assert.match(installer, /CHAMPCITY_MACHINE_RUN_NAME "ChampCity Background Agent"/);
  assert.match(
    installer,
    /StrCpy \$0 '\"\$INSTDIR\\\$\{APP_FILENAME\}\.exe\" \$\{CHAMPCITY_SERVICE_HOST_ARGUMENTS\}'/,
  );
  assert.match(installer, /CHAMPCITY_SERVICE_HOST_ARGUMENTS "--agent-harness-service-host --agent-harness-startup"/);

  const customInstall = installer.slice(
    installer.indexOf("!macro customInstall\n"),
    installer.indexOf("!macroend\n!endif", installer.indexOf("!macro customInstall\n")),
  );
  const allUsersBranch = customInstall.indexOf('$installMode == "all"');
  const machineWrite = customInstall.indexOf("Call ChampCityInstallMachineStartupTrigger");
  const currentUserMaintenance = customInstall.indexOf("--champcity-install-configure-background-agent=");
  assert.ok(allUsersBranch >= 0 && allUsersBranch < machineWrite && machineWrite < currentUserMaintenance);
  assert.match(customInstall, /\$installMode == "all"[\s\S]*Call ChampCityInstallMachineStartupTrigger[\s\S]*\$\{Else\}[\s\S]*--champcity-install-configure-background-agent=/);
});

test("scope conversion remains single-owner and fail-closed", () => {
  assert.match(installer, /StrCpy \$ChampCityResolvedInstallMode "\$installMode"/);
  assert.match(installer, /\$ChampCityResolvedInstallMode == "CurrentUser"/);
  assert.match(installer, /ReadRegStr \$1 HKLM "Software\\\$\{APP_GUID\}" InstallLocation/);
  assert.match(installer, /existing Everyone installation[\s\S]*must be uninstalled before installing for just the current user/i);
  assert.match(installer, /prevents duplicate installation and startup registration/i);
});

test("all-users uninstall is ordered, exact-file bounded, restorative, and non-destructive", () => {
  const uninstall = installer.slice(installer.indexOf("!ifdef BUILD_UNINSTALLER", 500));
  const validateScope = uninstall.indexOf("Call un.ChampCityValidateInstalledScopeMetadata");
  const snapshotTrigger = uninstall.indexOf("Call un.ChampCitySnapshotAndRemoveMachineStartupTrigger");
  const invokingUserCleanup = uninstall.indexOf("--champcity-uninstall-cleanup");
  const exactFileProbe = uninstall.indexOf("Call un.ChampCityVerifyInstalledExecutableUnused");
  const allowRemoval = uninstall.indexOf("Continuing uninstall");
  assert.ok(
    validateScope >= 0 &&
    validateScope < snapshotTrigger &&
    snapshotTrigger < invokingUserCleanup &&
    invokingUserCleanup < exactFileProbe &&
    exactFileProbe < allowRemoval,
  );
  assert.match(uninstall, /ReadRegStr \$ChampCityMachineStartupCommandSnapshot HKLM/);
  assert.match(uninstall, /DeleteRegValue HKLM/);
  assert.match(uninstall, /CreateFileW\(w "\$INSTDIR\\\$\{APP_FILENAME\}\.exe"/);
  assert.match(uninstall, /Call un\.ChampCityRestoreMachineStartupTrigger[\s\S]*machine sign-in trigger was restored/);
  assert.match(uninstall, /other user.*exit ChampCity A\/I or sign out/is);
  assert.doesNotMatch(installer, /taskkill|Stop-Process|KILL_PROCESS/i);
});

test("scope disclosure preserves user data and makes the all-users preference semantics visible", () => {
  assert.match(installer, /each Windows user's initial preference/i);
  assert.match(installer, /Each user can later change their own preference/i);
  assert.match(installer, /application data and credentials are preserved in your Windows profile/i);
  assert.match(installer, /no other Windows profile is modified/i);
});
