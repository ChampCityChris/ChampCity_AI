!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!define CHAMPCITY_INSTALL_SCOPE_METADATA_FILENAME "champcity-install-scope.json"
!define CHAMPCITY_MACHINE_RUN_KEY "Software\Microsoft\Windows\CurrentVersion\Run"
!define CHAMPCITY_MACHINE_RUN_NAME "ChampCity Background Agent"
!define CHAMPCITY_SERVICE_HOST_ARGUMENTS "--agent-harness-service-host --agent-harness-startup"

!ifdef BUILD_UNINSTALLER
  !define MUI_WELCOMEPAGE_TITLE "Uninstall ChampCity A/I"
  !define MUI_WELCOMEPAGE_TEXT "ChampCity application data and credentials are preserved in your Windows profile; no other Windows profile is modified.$\r$\n$\r$\nUninstall removes the application and its scope-appropriate Windows sign-in registration. It does not force-close ChampCity in another Windows session. Close ChampCity A/I before continuing."
  !define MUI_UNFINISHPAGE_TEXT "ChampCity A/I was removed. ChampCity application data and credentials remain preserved in your Windows profile; no other Windows profile was modified."
!endif

!ifndef BUILD_UNINSTALLER
Var ChampCityBackgroundAgentStartupCheckbox
Var ChampCityBackgroundAgentStartupChoice
Var ChampCityResolvedInstallMode
Var ChampCityInstalledScopeWriteResult
Var ChampCityMachineStartupWriteResult

Function ChampCityBackgroundAgentPageCreate
  ${If} $ChampCityBackgroundAgentStartupChoice == ""
    StrCpy $ChampCityBackgroundAgentStartupChoice "enabled"
  ${EndIf}

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 92u "ChampCity A/I includes a Background Agent that can start when you sign in to Windows and may remain running after the desktop window closes so authorized AI/MCP connections can remain available.$\r$\n$\r$\nFor an Everyone install, Windows uses one machine-managed sign-in trigger and this choice becomes each Windows user's initial preference. Each user can later change their own preference.$\r$\n$\r$\nThis option does not enable public Internet access. Network exposure and authentication are configured separately inside ChampCity."
  Pop $0

  ${NSD_CreateCheckbox} 0 102u 100% 18u "Start ChampCity Background Agent at Windows sign-in (recommended)"
  Pop $ChampCityBackgroundAgentStartupCheckbox
  ${If} $ChampCityBackgroundAgentStartupChoice == "enabled"
    ${NSD_Check} $ChampCityBackgroundAgentStartupCheckbox
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function ChampCityBackgroundAgentPageLeave
  ${NSD_GetState} $ChampCityBackgroundAgentStartupCheckbox $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $ChampCityBackgroundAgentStartupChoice "enabled"
  ${Else}
    StrCpy $ChampCityBackgroundAgentStartupChoice "disabled"
  ${EndIf}

  # Builder automatically removes a current-user install when changing to an
  # all-users install. The reverse transition requires the elevated all-users
  # uninstaller so its machine trigger is safely quiesced and removed first.
  ${If} $ChampCityResolvedInstallMode == "CurrentUser"
    SetRegView 64
    ClearErrors
    ReadRegStr $1 HKLM "Software\${APP_GUID}" InstallLocation
    ${If} $1 != ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "An existing Everyone installation of ChampCity A/I must be uninstalled before installing for just the current user. This prevents duplicate installation and startup registration."
      Abort
    ${EndIf}
  ${EndIf}
FunctionEnd

!macro customPageAfterChangeDir
  Function ChampCityBackgroundAgentPageCreateWithResolvedMode
    StrCpy $ChampCityResolvedInstallMode "$installMode"
    Call ChampCityBackgroundAgentPageCreate
  FunctionEnd
  Page custom ChampCityBackgroundAgentPageCreateWithResolvedMode ChampCityBackgroundAgentPageLeave
!macroend

Function ChampCityWriteInstalledScopeMetadata
  ${If} $ChampCityResolvedInstallMode == "all"
    ${If} $ChampCityBackgroundAgentStartupChoice == "enabled"
      StrCpy $0 '{"schemaVersion":1,"installScope":"all-users","backgroundAgentLaunchAtLoginDefault":true}'
    ${Else}
      StrCpy $0 '{"schemaVersion":1,"installScope":"all-users","backgroundAgentLaunchAtLoginDefault":false}'
    ${EndIf}
  ${Else}
    ${If} $ChampCityBackgroundAgentStartupChoice == "enabled"
      StrCpy $0 '{"schemaVersion":1,"installScope":"current-user","backgroundAgentLaunchAtLoginDefault":true}'
    ${Else}
      StrCpy $0 '{"schemaVersion":1,"installScope":"current-user","backgroundAgentLaunchAtLoginDefault":false}'
    ${EndIf}
  ${EndIf}

  StrCpy $ChampCityInstalledScopeWriteResult "failed"
  ClearErrors
  CreateDirectory "$INSTDIR\resources"
  IfErrors ChampCityWriteInstalledScopeMetadataFailed
  ClearErrors
  FileOpen $1 "$INSTDIR\resources\${CHAMPCITY_INSTALL_SCOPE_METADATA_FILENAME}" w
  IfErrors ChampCityWriteInstalledScopeMetadataFailed
  ClearErrors
  FileWrite $1 "$0$\r$\n"
  IfErrors 0 +3
    FileClose $1
    Goto ChampCityWriteInstalledScopeMetadataFailed
  FileClose $1

  ClearErrors
  FileOpen $1 "$INSTDIR\resources\${CHAMPCITY_INSTALL_SCOPE_METADATA_FILENAME}" r
  IfErrors ChampCityWriteInstalledScopeMetadataFailed
  ClearErrors
  FileRead $1 $2
  IfErrors 0 +3
    FileClose $1
    Goto ChampCityWriteInstalledScopeMetadataFailed
  FileClose $1
  ${If} $2 != "$0$\r$\n"
    Goto ChampCityWriteInstalledScopeMetadataFailed
  ${EndIf}

  StrCpy $ChampCityInstalledScopeWriteResult "ok"
  Return

  ChampCityWriteInstalledScopeMetadataFailed:
    Delete "$INSTDIR\resources\${CHAMPCITY_INSTALL_SCOPE_METADATA_FILENAME}"
FunctionEnd

Function ChampCityInstallMachineStartupTrigger
  StrCpy $ChampCityMachineStartupWriteResult "failed"
  StrCpy $0 '"$INSTDIR\${APP_FILENAME}.exe" ${CHAMPCITY_SERVICE_HOST_ARGUMENTS}'

  SetRegView 64
  ClearErrors
  ReadRegStr $2 HKLM "${CHAMPCITY_MACHINE_RUN_KEY}" "${CHAMPCITY_MACHINE_RUN_NAME}"
  ClearErrors
  WriteRegStr HKLM "${CHAMPCITY_MACHINE_RUN_KEY}" "${CHAMPCITY_MACHINE_RUN_NAME}" "$0"
  IfErrors ChampCityInstallMachineStartupTriggerFailed
  ClearErrors
  ReadRegStr $1 HKLM "${CHAMPCITY_MACHINE_RUN_KEY}" "${CHAMPCITY_MACHINE_RUN_NAME}"
  IfErrors ChampCityInstallMachineStartupTriggerFailed
  ${If} $1 != $0
    Goto ChampCityInstallMachineStartupTriggerFailed
  ${EndIf}

  StrCpy $ChampCityMachineStartupWriteResult "ok"
  Return

  ChampCityInstallMachineStartupTriggerFailed:
    ${If} $2 == ""
      DeleteRegValue HKLM "${CHAMPCITY_MACHINE_RUN_KEY}" "${CHAMPCITY_MACHINE_RUN_NAME}"
    ${Else}
      WriteRegStr HKLM "${CHAMPCITY_MACHINE_RUN_KEY}" "${CHAMPCITY_MACHINE_RUN_NAME}" "$2"
    ${EndIf}
FunctionEnd

!macro customInstall
  StrCpy $ChampCityResolvedInstallMode "$installMode"
  DetailPrint "Writing exact ChampCity A/I installation-scope metadata..."
  Call ChampCityWriteInstalledScopeMetadata
  ${If} $ChampCityInstalledScopeWriteResult != "ok"
    MessageBox MB_OK|MB_ICONSTOP "ChampCity A/I could not write and verify its installation-scope metadata. Installation cannot complete safely."
    SetErrorLevel 30
    Abort
  ${EndIf}

  ${If} $installMode == "all"
    DetailPrint "Creating the machine-managed ChampCity Background Agent sign-in trigger..."
    Call ChampCityInstallMachineStartupTrigger
    ${If} $ChampCityMachineStartupWriteResult != "ok"
      Delete "$INSTDIR\resources\${CHAMPCITY_INSTALL_SCOPE_METADATA_FILENAME}"
      MessageBox MB_OK|MB_ICONSTOP "ChampCity A/I could not create and verify the exact machine-wide Background Agent sign-in trigger. Installation cannot complete safely."
      SetErrorLevel 31
      Abort
    ${EndIf}
  ${Else}
    DetailPrint "Applying the current Windows user's ChampCity A/I Background Agent startup choice..."
    ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --champcity-install-configure-background-agent=$ChampCityBackgroundAgentStartupChoice' $0
    ${If} $0 != 0
      MessageBox MB_OK|MB_ICONSTOP "ChampCity A/I could not apply the selected Background Agent startup setting (error $0). Installation cannot complete safely."
      SetErrorLevel $0
      Abort
    ${EndIf}
  ${EndIf}
!macroend
!endif

# Electron Builder's default check can force-kill by executable image name.
# ChampCity owns shutdown through its authenticated local Service Host endpoint.
!macro customCheckAppRunning
!macroend

!ifdef BUILD_UNINSTALLER
Var ChampCityInstalledScopeValidationResult
Var ChampCityResolvedInstallMode
Var ChampCityMachineStartupExpectedCommand
Var ChampCityMachineStartupCommandSnapshot
Var ChampCityMachineStartupRemoved
Var ChampCityMachineStartupRestoreResult
Var ChampCityExecutableUseResult

Function un.ChampCityValidateInstalledScopeMetadata
  StrCpy $ChampCityInstalledScopeValidationResult "invalid"
  ClearErrors
  FileOpen $0 "$INSTDIR\resources\${CHAMPCITY_INSTALL_SCOPE_METADATA_FILENAME}" r
  IfErrors ChampCityValidateInstalledScopeMetadataDone
  ClearErrors
  FileRead $0 $1
  IfErrors 0 +3
    FileClose $0
    Goto ChampCityValidateInstalledScopeMetadataDone
  FileClose $0

  ${If} $ChampCityResolvedInstallMode == "all"
    ${If} $1 == '{"schemaVersion":1,"installScope":"all-users","backgroundAgentLaunchAtLoginDefault":true}$\r$\n'
    ${OrIf} $1 == '{"schemaVersion":1,"installScope":"all-users","backgroundAgentLaunchAtLoginDefault":false}$\r$\n'
      StrCpy $ChampCityInstalledScopeValidationResult "all-users"
    ${EndIf}
  ${Else}
    ${If} $1 == '{"schemaVersion":1,"installScope":"current-user","backgroundAgentLaunchAtLoginDefault":true}$\r$\n'
    ${OrIf} $1 == '{"schemaVersion":1,"installScope":"current-user","backgroundAgentLaunchAtLoginDefault":false}$\r$\n'
      StrCpy $ChampCityInstalledScopeValidationResult "current-user"
    ${EndIf}
  ${EndIf}

  ChampCityValidateInstalledScopeMetadataDone:
FunctionEnd

Function un.ChampCitySnapshotAndRemoveMachineStartupTrigger
  StrCpy $ChampCityMachineStartupRemoved "0"
  StrCpy $ChampCityMachineStartupExpectedCommand '"$INSTDIR\${APP_FILENAME}.exe" ${CHAMPCITY_SERVICE_HOST_ARGUMENTS}'
  SetRegView 64
  ClearErrors
  ReadRegStr $ChampCityMachineStartupCommandSnapshot HKLM "${CHAMPCITY_MACHINE_RUN_KEY}" "${CHAMPCITY_MACHINE_RUN_NAME}"
  IfErrors ChampCitySnapshotAndRemoveMachineStartupTriggerDone
  ${If} $ChampCityMachineStartupCommandSnapshot != $ChampCityMachineStartupExpectedCommand
    Return
  ${EndIf}

  ClearErrors
  DeleteRegValue HKLM "${CHAMPCITY_MACHINE_RUN_KEY}" "${CHAMPCITY_MACHINE_RUN_NAME}"
  IfErrors ChampCitySnapshotAndRemoveMachineStartupTriggerDone
  ClearErrors
  ReadRegStr $0 HKLM "${CHAMPCITY_MACHINE_RUN_KEY}" "${CHAMPCITY_MACHINE_RUN_NAME}"
  ${If} $0 != ""
    Return
  ${EndIf}
  StrCpy $ChampCityMachineStartupRemoved "1"

  ChampCitySnapshotAndRemoveMachineStartupTriggerDone:
FunctionEnd

Function un.ChampCityRestoreMachineStartupTrigger
  StrCpy $ChampCityMachineStartupRestoreResult "failed"
  ${If} $ChampCityMachineStartupRemoved != "1"
    Return
  ${EndIf}

  SetRegView 64
  ClearErrors
  WriteRegStr HKLM "${CHAMPCITY_MACHINE_RUN_KEY}" "${CHAMPCITY_MACHINE_RUN_NAME}" "$ChampCityMachineStartupCommandSnapshot"
  IfErrors ChampCityRestoreMachineStartupTriggerDone
  ClearErrors
  ReadRegStr $0 HKLM "${CHAMPCITY_MACHINE_RUN_KEY}" "${CHAMPCITY_MACHINE_RUN_NAME}"
  IfErrors ChampCityRestoreMachineStartupTriggerDone
  ${If} $0 == $ChampCityMachineStartupCommandSnapshot
    StrCpy $ChampCityMachineStartupRestoreResult "ok"
    StrCpy $ChampCityMachineStartupRemoved "0"
  ${EndIf}

  ChampCityRestoreMachineStartupTriggerDone:
FunctionEnd

Function un.ChampCityVerifyInstalledExecutableUnused
  StrCpy $ChampCityExecutableUseResult "unverifiable"
  ${IfNot} ${FileExists} "$INSTDIR\${APP_FILENAME}.exe"
    StrCpy $ChampCityExecutableUseResult "absent"
    Return
  ${EndIf}

  # A non-mutating, exclusive read/write handle proves that the exact installed
  # executable is not mapped by another Windows user/session. Any failure is
  # treated as still in use or unverifiable; no process is enumerated or killed.
  System::Call 'kernel32::CreateFileW(w "$INSTDIR\${APP_FILENAME}.exe", i 0xC0000000, i 0, p 0, i 3, i 0x80, p 0) p.r0'
  ${If} $0 == -1
    StrCpy $ChampCityExecutableUseResult "blocked"
    Return
  ${EndIf}
  System::Call 'kernel32::CloseHandle(p r0)'
  StrCpy $ChampCityExecutableUseResult "unlocked"
FunctionEnd

!macro customUnInstall
  StrCpy $ChampCityResolvedInstallMode "$installMode"
  Call un.ChampCityValidateInstalledScopeMetadata
  ${If} $ChampCityInstalledScopeValidationResult == "invalid"
    MessageBox MB_OK|MB_ICONSTOP "ChampCity A/I could not verify the exact installed scope. No startup registration or installed files have been removed."
    SetErrorLevel 32
    Abort
  ${EndIf}

  ${If} $ChampCityInstalledScopeValidationResult == "all-users"
    ChampCityAllUsersUninstallRetry:
    DetailPrint "Snapshotting and disabling the exact machine-managed ChampCity Background Agent sign-in trigger..."
    Call un.ChampCitySnapshotAndRemoveMachineStartupTrigger
    ${If} $ChampCityMachineStartupRemoved != "1"
      MessageBox MB_OK|MB_ICONSTOP "ChampCity A/I could not verify and disable its exact machine-wide Background Agent sign-in trigger. No installed files have been removed."
      SetErrorLevel 33
      Abort
    ${EndIf}

    DetailPrint "Stopping the invoking Windows user's ChampCity A/I Background Agent..."
    ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --champcity-uninstall-cleanup' $0
    ${If} $0 != 0
      StrCpy $1 $0
      Call un.ChampCityRestoreMachineStartupTrigger
      ${If} $ChampCityMachineStartupRestoreResult != "ok"
        MessageBox MB_OK|MB_ICONSTOP "Uninstall stopped, but ChampCity A/I could not restore the exact machine-wide Background Agent sign-in trigger. Installed files remain. Repair the machine startup entry before retrying."
        SetErrorLevel 34
        Abort
      ${EndIf}
      ${If} ${Silent}
        SetErrorLevel $1
        Abort
      ${EndIf}
      ${If} $1 == 20
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "The ChampCity A/I desktop is still open for this Windows user. Close it, then choose Retry. The machine sign-in trigger was restored and no installed files have been removed." IDRETRY ChampCityAllUsersUninstallRetry
      ${ElseIf} $1 == 22
        MessageBox MB_RETRYCANCEL|MB_ICONSTOP "ChampCity could not verify ownership of this user's Background Agent endpoint. Close ChampCity processes you recognize, then choose Retry. No process will be force-killed; the machine sign-in trigger was restored and no installed files have been removed." IDRETRY ChampCityAllUsersUninstallRetry
      ${Else}
        MessageBox MB_RETRYCANCEL|MB_ICONSTOP "ChampCity could not safely stop this user's Background Agent (error $1). Resolve the problem, then choose Retry. The machine sign-in trigger was restored and no installed files have been removed." IDRETRY ChampCityAllUsersUninstallRetry
      ${EndIf}
      SetErrorLevel $1
      Abort
    ${EndIf}

    DetailPrint "Verifying that no Windows user/session is using the exact installed ChampCityAI.exe..."
    Call un.ChampCityVerifyInstalledExecutableUnused
    ${If} $ChampCityExecutableUseResult != "absent"
    ${AndIf} $ChampCityExecutableUseResult != "unlocked"
      Call un.ChampCityRestoreMachineStartupTrigger
      ${If} $ChampCityMachineStartupRestoreResult != "ok"
        MessageBox MB_OK|MB_ICONSTOP "Uninstall stopped, but ChampCity A/I could not restore the exact machine-wide Background Agent sign-in trigger. Installed files remain. Repair the machine startup entry before retrying."
        SetErrorLevel 34
        Abort
      ${EndIf}
      ${If} ${Silent}
        SetErrorLevel 35
        Abort
      ${EndIf}
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Another Windows user/session may still be running this installed ChampCity A/I executable. Have every other user exit ChampCity A/I or sign out, then choose Retry. No process will be force-killed; the machine sign-in trigger was restored and no installed files have been removed." IDRETRY ChampCityAllUsersUninstallRetry
      SetErrorLevel 35
      Abort
    ${EndIf}

    DetailPrint "The exact machine startup trigger is removed and the installed executable is unused. Continuing uninstall."
  ${Else}
    ChampCityCurrentUserUninstallCleanupRetry:
    DetailPrint "Stopping the ChampCity A/I Background Agent and removing the current user's Windows sign-in registration..."
    ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --champcity-uninstall-cleanup' $0
    ${If} $0 != 0
      ${If} ${Silent}
        SetErrorLevel $0
        Abort
      ${EndIf}
      ${If} $0 == 20
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "The ChampCity A/I desktop is still open. Close it, then choose Retry. No installed files have been removed." IDRETRY ChampCityCurrentUserUninstallCleanupRetry
      ${ElseIf} $0 == 22
        MessageBox MB_RETRYCANCEL|MB_ICONSTOP "ChampCity could not verify ownership of the Background Agent endpoint. Close ChampCity processes you recognize, then choose Retry. No process will be force-killed and no installed files have been removed." IDRETRY ChampCityCurrentUserUninstallCleanupRetry
      ${Else}
        MessageBox MB_RETRYCANCEL|MB_ICONSTOP "ChampCity could not safely stop the Background Agent or remove Windows sign-in registration (error $0). Resolve the problem, then choose Retry. No installed files have been removed." IDRETRY ChampCityCurrentUserUninstallCleanupRetry
      ${EndIf}
      SetErrorLevel $0
      Abort
    ${EndIf}
  ${EndIf}
  DetailPrint "ChampCity application data and credentials are preserved in your Windows profile; no other Windows profile is modified."
!macroend
!endif
