import { checkbox, select, Separator } from '@inquirer/prompts';
import { UserCancelledError } from '../utils/errors.js';

/**
 * Hook selection options for the CLI
 */
export const HOOK_CHOICES = [
    new Separator(),
    new Separator('Notification Hook'),
    { name: 'Notify on task completion', value: 'onNotification', checked: true },
    { name: 'Add sound to completion notification', value: 'onNotificationSound' },
    new Separator(),
    new Separator('Stop Hook'),
    { name: 'Notify on task stop', value: 'onStop' },
    { name: 'Add sound to stop notification', value: 'onStopSound' },
];

/**
 * Show hook selection prompt
 * @returns {Promise<string[]>} Array of selected hook values
 * @throws {UserCancelledError} If user cancels the operation
 */
export async function promptHookSelection() {
    try {
        const selectedHooks = await checkbox({
            message: 'Select hooks to install (Press <space> to toggle, <enter> to confirm)',
            choices: HOOK_CHOICES,
            theme: {
                helpMode: 'never'
            },
            loop: false,
            pageSize: 10,
        }, {
            clearPromptOnDone: true
        });

        return selectedHooks;
    } catch (error) {
        if (error.name === 'ExitPromptError') {
            throw new UserCancelledError('Hook selection cancelled');
        }
        throw error;
    }
}

/**
 * Generate confirmation choices showing selected hooks
 * @param {string[]} selectedHooks - Array of selected hook values
 * @returns {object[]} Array of choice objects for confirmation prompt
 */
export function generateConfirmationChoices(selectedHooks) {
    const resultArray = [];

    HOOK_CHOICES.forEach(choice => {
        if (choice instanceof Separator) {
            return;
        }

        const isSelected = selectedHooks.includes(choice.value);
        const marker = isSelected ? '[X]' : '[ ]';
        resultArray.push(new Separator(`  ${marker} ${choice.name}`));
    });

    return [
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
    ];
}

/**
 * Show confirmation prompt with selected hooks
 * @param {string[]} selectedHooks - Array of selected hook values
 * @returns {Promise<string>} The action selected ('install' or 'exit')
 * @throws {UserCancelledError} If user cancels the operation
 */
export async function promptConfirmation(selectedHooks) {
    const confirmationChoices = generateConfirmationChoices(selectedHooks);

    try {
        const action = await select({
            message: 'Confirm choices and proceed? (Press <enter> to confirm)',
            choices: confirmationChoices,
            pageSize: 10,
            loop: false,
        });

        return action;
    } catch (error) {
        if (error.name === 'ExitPromptError') {
            throw new UserCancelledError('Confirmation cancelled');
        }
        throw error;
    }
}

/**
 * Validate selected hooks
 * @param {string[]} selectedHooks - Array of selected hook values
 * @returns {object} Validation result with isValid and errors
 */
export function validateHookSelection(selectedHooks) {
    const errors = [];

    if (!Array.isArray(selectedHooks)) {
        errors.push('Selected hooks must be an array');
        return { isValid: false, errors };
    }

    if (selectedHooks.length === 0) {
        errors.push('No hooks selected');
        return { isValid: false, errors };
    }

    // Validate that all selected hooks are valid
    const validHookValues = HOOK_CHOICES
        .filter(choice => !(choice instanceof Separator))
        .map(choice => choice.value);

    const invalidHooks = selectedHooks.filter(hook => !validHookValues.includes(hook));
    if (invalidHooks.length > 0) {
        errors.push(`Invalid hook values: ${invalidHooks.join(', ')}`);
    }

    // Validate hook dependencies
    if (selectedHooks.includes('onNotificationSound') && !selectedHooks.includes('onNotification')) {
        errors.push('Sound for completion notification requires completion notification to be enabled');
    }

    if (selectedHooks.includes('onStopSound') && !selectedHooks.includes('onStop')) {
        errors.push('Sound for stop notification requires stop notification to be enabled');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Get hook configuration from selected hooks
 * @param {string[]} selectedHooks - Array of selected hook values
 * @returns {object} Object containing hook configuration preferences
 */
export function parseHookSelection(selectedHooks) {
    return {
        notificationEnabled: selectedHooks.includes('onNotification'),
        notificationWithSound: selectedHooks.includes('onNotificationSound'),
        stopEnabled: selectedHooks.includes('onStop'),
        stopWithSound: selectedHooks.includes('onStopSound')
    };
}