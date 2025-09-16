#!/usr/bin/env node

import { checkbox, select, Separator } from '@inquirer/prompts';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { homedir, platform } from 'os';

// Enter alternate screen buffer and clear screen
console.log('\x1b[?1049h\x1b[2J\x1b[H');

// Ensure exit sequence is always called to restore the terminal
process.on('exit', () => {
    // Exit alternate screen buffer
    console.log('\x1b[?1049l');
});

const getSettingsPath = () => {
    const home = homedir();
    // The settings file is expected in a .claude directory in the user's home directory for all platforms.
    return path.join(home, '.claude', 'settings.json');
};

const getPlatformCommand = (action, withSound) => {
    const osPlatform = platform();
    if (osPlatform === 'darwin') { // macOS
        return `osascript -e 'display notification "Claude Task ${action}!" with title "Claude Code"${withSound ? ' sound name "Ping"' : ''}'`;
    }
    if (osPlatform === 'win32') { // Windows
        const title = 'Claude Code';
        const message = `Claude Task ${action}!`;
        // This command, provided by the user, creates a balloon tip notification.
        // Note: The 'withSound' parameter is not directly used here as the user's command did not specify it.
        const psCommand = `Add-Type -AssemblyName System.Windows.Forms; $balloon = New-Object System.Windows.Forms.NotifyIcon; $path = (Get-Process -Id $pid).Path; $balloon.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path); $balloon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Warning; $balloon.BalloonTipText = '${message}'; $balloon.BalloonTipTitle = '${title}'; $balloon.Visible = $true; $balloon.ShowBalloonTip(5000)`;
        return `powershell -NoProfile -Command "${psCommand}"`;
    }
    return null; // Unsupported platform
};

console.log('─────────────────────────');
console.log('Claude Code Task Notifier');
console.log('─────────────────────────');

const hookChoices = [
    new Separator(),
    new Separator('Notification Hook'),
    { name: 'Notify on task completion', value: 'onNotification', checked: true },
    { name: 'Add sound to completion notification', value: 'onNotificationSound' },
    new Separator(),
    new Separator('Stop Hook'),
    { name: 'Notify on task stop', value: 'onStop' },
    { name: 'Add sound to stop notification', value: 'onStopSound' },
];

const selectedHooks = await checkbox({
    message: 'Select hooks to install (Press <space> to toggle, <enter> to confirm)',
    choices: hookChoices,
    theme: {
        helpMode: 'never'
    },
    loop: false,
    pageSize: 10,
}, {
    clearPromptOnDone: true
});


let resultArray = [];

hookChoices.forEach(choice => {
    if (choice instanceof Separator) {
        return;
    }
    const isSelected = selectedHooks.includes(choice.value);
    const marker = isSelected ? '[X]' : '[ ]';
    resultArray.push(new Separator(`  ${marker} ${choice.name}`));
});


const action = await select({
    message: 'Confirm choices and proceed? (Press <enter> to confirm)',
    choices: [
        new Separator(),
        ...resultArray,
        new Separator(),
        {
            name: 'Install Hook To Claude Code',
            value: 'install',
        },
        {
            name: 'Exit',
            value: 'exit',
        },
    ],
    pageSize: 10,
    loop: false,
});

if (action === 'exit') {
    console.log('Aborted.');
    process.exit();
}

if (selectedHooks.length === 0) {
    console.log('No hooks selected. Exiting.');
    process.exit();
}

const newHooks = {};

if (selectedHooks.includes('onNotification')) {
    const withSound = selectedHooks.includes('onNotificationSound');
    const command = getPlatformCommand('Completed', withSound);
    if (command) {
        newHooks.Notification = [
            {
                hooks: [
                    {
                        type: 'command',
                        command: command,
                    },
                ],
            },
        ];
    }
}

if (selectedHooks.includes('onStop')) {
    const withSound = selectedHooks.includes('onStopSound');
    const command = getPlatformCommand('Stopped', withSound);
    if (command) {
        newHooks.Stop = [
            {
                hooks: [
                    {
                        type: 'command',
                        command: command,
                    },
                ],
            },
        ];
    }
}

if (Object.values(newHooks).every(cmd => cmd === null)) {
    console.error('Error: Unsupported operating system. Only macOS and Windows are supported.');
    process.exit(1);
}



const settingsPath = getSettingsPath();
const settingsDir = path.dirname(settingsPath);

try {
    let settings = {};
    if (existsSync(settingsPath)) {
        try {
            const settingsFile = readFileSync(settingsPath, 'utf-8');
            if (settingsFile) {
                settings = JSON.parse(settingsFile);
            }
        } catch (e) {
            console.error(`Error reading or parsing existing settings.json: ${e.message}`);
            process.exit(1);
        }
    } else {
        if (!existsSync(settingsDir)) {
            mkdirSync(settingsDir, { recursive: true });
        }
    }

    settings.hooks = { ...(settings.hooks || {}), ...newHooks };

    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`✅ Hooks added to ${settingsPath}`);

} catch (error) {
    console.error(`Error writing settings.json: ${error.message}`);
    process.exit(1);
}
