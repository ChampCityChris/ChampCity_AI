# Install, Update, and Uninstall ChampCity A/I Desktop

This guide covers the current Windows x64 installer. It does not describe the future ChampCity A/I Server product.

## Before installing

The release installer is named:

```text
ChampCityAI-Setup-<version>.exe
```

Download it only from the matching ChampCity A/I Desktop GitHub Release and compare its published SHA-256 with the downloaded file:

```powershell
Get-FileHash -Algorithm SHA256 .\ChampCityAI-Setup-<version>.exe
```

The current build configuration does not provide a code-signing identity. Windows may therefore show **Unknown Publisher** or a Microsoft Defender SmartScreen warning. A warning is not proof that a file is safe: proceed only when the source and SHA-256 are the expected release values.

## Install for Current User or Everyone

1. Run `ChampCityAI-Setup-<version>.exe`.
2. Choose the installation scope:
   - **Current User** installs for the signed-in Windows user and does not require machine-wide startup registration.
   - **Everyone** installs one application for all Windows users and requests elevation through User Account Control (UAC).
3. Choose the destination directory when prompted.
4. On the Background Agent page, leave **Start ChampCity Background Agent at Windows sign-in (recommended)** selected for normal use, or clear it if the agent should start only when ChampCity is opened.
5. Finish installation. The installer creates Start Menu and desktop shortcuts but does not automatically launch the foreground application when installation completes.

Installation stops instead of continuing with ambiguous state if it cannot verify its exact install-scope metadata or required startup registration.

## What the Background Agent choice means

For a **Current User** install, Windows login registration belongs to that Windows user. Changing **Start Background Agent for my Windows user at sign-in** in ChampCity Settings updates that user's startup registration.

For an **Everyone** install, the installer creates one elevated, machine-managed sign-in trigger. The installer choice becomes each user's initial preference. At sign-in, each user's separate preference determines whether their Background Agent continues to start. The shared machine trigger remains installer-owned; Settings reports **Windows startup trigger: Managed for everyone** rather than transferring machine ownership to the user.

This choice does not expose ChampCity to the public Internet. The current MCP server binds only to the local computer. Connector metadata and authentication are configured separately in **Settings → Agent Harness**.

## Per-user application data

Both installation scopes keep these items separate for each Windows user:

- ChampCity application settings and lifecycle intent;
- registered MCP projects;
- OAuth clients, grants, and hashed token material;
- managed Codex runtime state and model/reasoning preference;
- Background Agent descriptors and diagnostics.

They are stored under ChampCity's `champcity-ai` per-user Windows application-data directory. Project workflow documents and evidence remain in the project directory selected by that user.

An Everyone installation shares installed program files, not ChampCity user state or project state.

## Reinstall or update

- Close the foreground ChampCity window before running an installer over an existing installation.
- For an Everyone install, have other Windows users select **Exit Background Agent** or sign out before an update that replaces installed files.
- Run the installer for the intended version and keep the same installation scope unless deliberately changing it.
- Moving from an Everyone install to Current User requires uninstalling the Everyone installation first. The installer blocks this direction to prevent duplicate startup registration.
- Moving from Current User to Everyone is handled by the installer, including replacement of the prior current-user installation.
- Per-user ChampCity state and selected-project files are preserved across reinstall/update. The installer does not provide an in-app automatic-update channel, and differential installer packages are disabled.

After updating, open **Settings → Agent Harness**. If **Background Agent update required** appears, use **Restart Background Agent** so the running service matches the newly installed build generation.

## Uninstall

1. Close the ChampCity A/I foreground window.
2. When possible, open the tray menu and select **Exit Background Agent** for the invoking Windows user.
3. Start uninstall from Windows Installed Apps or the ChampCity uninstaller.
4. Follow the prompts. The uninstaller verifies the exact installation scope before removing startup registration or installed files.

For a Current User install, uninstall disables that user's login registration and gracefully stops that user's Background Agent.

For an Everyone install, uninstall temporarily removes the exact machine-managed startup trigger, gracefully stops the invoking user's Background Agent, and confirms that no Windows user/session is using the installed `ChampCityAI.exe`. It does not enumerate and force-kill another user's process.

If another user or session is still using the application, uninstall restores the machine startup trigger and stops without removing installed files. Have all other users choose **Exit Background Agent**, close ChampCity, or sign out, then select **Retry**.

## Data retained after uninstall

Uninstall removes the installed application and the applicable Windows sign-in registration. It intentionally preserves:

- the invoking user's ChampCity application data and credentials;
- other Windows users' ChampCity data and credentials;
- every selected project's repository files, workflow documents, and evidence.

The current uninstaller does not offer a delete-user-data option. Remove preserved user data only as a separate, deliberate action after confirming it is no longer needed. Do not delete project repositories as part of application uninstall.

See [Troubleshooting](TROUBLESHOOTING.md) for blocked uninstall and startup-registration recovery.
