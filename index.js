#!/usr/bin/env node

import { Terminal } from './src/cli/terminal.js';
import { promptHookSelection, promptConfirmation, validateHookSelection, parseHookSelection } from './src/cli/prompts.js';
import { ClaudeSettings } from './src/config/settings.js';
import { createNotificationCommand, isNotificationSupported } from './src/platforms/index.js';
import { handleError, safeExit, UserCancelledError, UnsupportedPlatformError, InvalidInputError } from './src/utils/errors.js';
import { ValidationUtils } from './src/utils/validation.js';

/**
 * Main application function
 */
async function main() {
    try {
        // Setup terminal
        Terminal.setup();
        Terminal.printHeader('Claude Code Task Notifier');

        // Check platform support
        if (!isNotificationSupported()) {
            throw new UnsupportedPlatformError();
        }

        // Get hook selection from user
        const selectedHooks = await promptHookSelection();

        // Validate selection
        const validation = validateHookSelection(selectedHooks);
        if (!validation.isValid) {
            throw new InvalidInputError(validation.errors.join('; '));
        }

        // Show confirmation
        const action = await promptConfirmation(selectedHooks);

        if (action === 'exit') {
            throw new UserCancelledError('Installation cancelled');
        }

        // Parse hook configuration
        const config = parseHookSelection(selectedHooks);

        // Generate hooks
        const newHooks = await generateHooks(config);

        // Save to settings
        await saveHooksToSettings(newHooks);

        Terminal.printSuccess(`Hooks installed successfully!`);

    } catch (error) {
        handleError(error, true);
    }
}

/**
 * Generate hook configuration from user preferences
 * @param {object} config - Parsed hook configuration
 * @returns {Promise<object>} Generated hooks object
 */
async function generateHooks(config) {
    const newHooks = {};

    if (config.notificationEnabled) {
        try {
            ValidationUtils.validateAction('Completed');
            const command = createNotificationCommand('Completed', config.notificationWithSound);

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
        } catch (error) {
            throw new Error(`Failed to create notification hook: ${error.message}`);
        }
    }

    if (config.stopEnabled) {
        try {
            ValidationUtils.validateAction('Stopped');
            const command = createNotificationCommand('Stopped', config.stopWithSound);

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
        } catch (error) {
            throw new Error(`Failed to create stop hook: ${error.message}`);
        }
    }

    return newHooks;
}

/**
 * Save hooks to Claude settings file
 * @param {object} newHooks - Hooks to save
 * @returns {Promise<void>}
 */
async function saveHooksToSettings(newHooks) {
    const settings = new ClaudeSettings();

    try {
        await settings.load();
        await settings.mergeHooks(newHooks);
        await settings.save();

        Terminal.printInfo(`Settings saved to: ${settings.getPath()}`);

    } catch (error) {
        throw new Error(`Failed to save settings: ${error.message}`);
    }
}

// Run the application
main();