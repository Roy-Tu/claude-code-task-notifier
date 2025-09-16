# Claude Code Task Notifier

A simple CLI to set up native desktop notifications for Claude Code tasks (e.g., completion, stop). Cross-platform and easy to use.

## Usage

You can run this tool using `npx` for a zero-installation setup.

```bash
npx claude-code-task-notifier
```

This will open an interactive setup process to configure your notification hooks.

## Features

-   **Cross-Platform:** Supports native notifications on macOS and Windows.
-   **Simple Interface:** A minimal, interactive CLI to get you set up in seconds.
-   **Zero-Install:** Uses `npx` to run without needing a global installation.

## How it Works

The tool detects your operating system and adds the appropriate hook commands to your Claude Code `settings.json` file.

-   **macOS:** Uses `osascript` to display native notifications.
-   **Windows:** Uses a built-in PowerShell script to display a native balloon tip notification from the system tray.

The configuration file is typically located at:
-   **Windows:** `%USERPROFILE%\.claude\settings.json`
-   **macOS/Linux:** `~/.claude/settings.json`

## Development

To run the tool locally:

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Run the tool: `npm start`
