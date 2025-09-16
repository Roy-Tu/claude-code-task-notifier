import { checkbox, select, Separator } from '@inquirer/prompts';
import { UserCancelledError } from '../utils/errors.js';
import {
  HookSelection,
  ConfirmationAction,
  ValidationResult,
  HookConfiguration,
  PromptChoice,
} from '../types/index.js';

/**
 * Hook selection options for the CLI
 */
export const HOOK_CHOICES: (Separator | PromptChoice)[] = [
  new Separator(),
  new Separator('Notification Hook'),
  { name: 'Notify on task completion', value: HookSelection.ON_NOTIFICATION, checked: true },
  { name: 'Add sound to completion notification', value: HookSelection.ON_NOTIFICATION_SOUND },
  new Separator(),
  new Separator('Stop Hook'),
  { name: 'Notify on task stop', value: HookSelection.ON_STOP },
  { name: 'Add sound to stop notification', value: HookSelection.ON_STOP_SOUND },
];

/**
 * Show hook selection prompt
 * @returns Array of selected hook values
 * @throws UserCancelledError if user cancels the operation
 */
export async function promptHookSelection(): Promise<HookSelection[]> {
  try {
    const selectedHooks = await checkbox({
      message: 'Select hooks to install (Press <space> to toggle, <enter> to confirm)',
      choices: HOOK_CHOICES,
      theme: {
        helpMode: 'never',
      },
      loop: false,
      pageSize: 10,
    }, {
      clearPromptOnDone: true,
    });

    return selectedHooks as HookSelection[];
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError') {
      throw new UserCancelledError('Hook selection cancelled');
    }
    throw error;
  }
}

/**
 * Generate confirmation choices showing selected hooks
 * @param selectedHooks - Array of selected hook values
 * @returns Array of choice objects for confirmation prompt
 */
export function generateConfirmationChoices(selectedHooks: HookSelection[]): (Separator | PromptChoice)[] {
  const resultArray: Separator[] = [];

  HOOK_CHOICES.forEach((choice) => {
    if (choice instanceof Separator) {
      return;
    }

    const isSelected = selectedHooks.includes(choice.value as HookSelection);
    const marker = isSelected ? '[X]' : '[ ]';
    resultArray.push(new Separator(`  ${marker} ${choice.name}`));
  });

  return [
    new Separator(),
    ...resultArray,
    new Separator(),
    {
      name: 'Install Hook To Claude Code',
      value: ConfirmationAction.INSTALL,
    },
    {
      name: 'Exit',
      value: ConfirmationAction.EXIT,
    },
  ];
}

/**
 * Show confirmation prompt with selected hooks
 * @param selectedHooks - Array of selected hook values
 * @returns The action selected ('install' or 'exit')
 * @throws UserCancelledError if user cancels the operation
 */
export async function promptConfirmation(selectedHooks: HookSelection[]): Promise<ConfirmationAction> {
  const confirmationChoices = generateConfirmationChoices(selectedHooks);

  try {
    const action = await select({
      message: 'Confirm choices and proceed? (Press <enter> to confirm)',
      choices: confirmationChoices,
      pageSize: 10,
      loop: false,
    });

    return action as ConfirmationAction;
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError') {
      throw new UserCancelledError('Confirmation cancelled');
    }
    throw error;
  }
}

/**
 * Validate selected hooks
 * @param selectedHooks - Array of selected hook values
 * @returns Validation result with isValid and errors
 */
export function validateHookSelection(selectedHooks: HookSelection[]): ValidationResult {
  const errors: string[] = [];

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
    .filter((choice): choice is PromptChoice => !(choice instanceof Separator))
    .map((choice) => choice.value as HookSelection);

  const invalidHooks = selectedHooks.filter((hook) => !validHookValues.includes(hook));
  if (invalidHooks.length > 0) {
    errors.push(`Invalid hook values: ${invalidHooks.join(', ')}`);
  }

  // Validate hook dependencies
  if (selectedHooks.includes(HookSelection.ON_NOTIFICATION_SOUND) && !selectedHooks.includes(HookSelection.ON_NOTIFICATION)) {
    errors.push('Sound for completion notification requires completion notification to be enabled');
  }

  if (selectedHooks.includes(HookSelection.ON_STOP_SOUND) && !selectedHooks.includes(HookSelection.ON_STOP)) {
    errors.push('Sound for stop notification requires stop notification to be enabled');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get hook configuration from selected hooks
 * @param selectedHooks - Array of selected hook values
 * @returns Object containing hook configuration preferences
 */
export function parseHookSelection(selectedHooks: HookSelection[]): HookConfiguration {
  return {
    notificationEnabled: selectedHooks.includes(HookSelection.ON_NOTIFICATION),
    notificationWithSound: selectedHooks.includes(HookSelection.ON_NOTIFICATION_SOUND),
    stopEnabled: selectedHooks.includes(HookSelection.ON_STOP),
    stopWithSound: selectedHooks.includes(HookSelection.ON_STOP_SOUND),
  };
}