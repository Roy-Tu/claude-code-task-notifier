import { checkbox, select, Separator } from '@inquirer/prompts';
import { UserCancelledError } from '../utils/errors.js';
import { isSoundSupported } from '../platforms/index.js';
import {
  HookSelection,
  ConfirmationAction,
  ValidationResult,
  HookConfiguration,
  PromptChoice,
  MainMenuAction,
  ConfigurationStatus,
} from '../types/index.js';

/**
 * Get notification type choices (step 1 - private helper)
 * @returns Array of notification type choices
 */
function getNotificationChoices(): (Separator | PromptChoice)[] {
  return [
    new Separator(),
    new Separator('Select Notification Types'),
    { name: 'Notify on task completion', value: HookSelection.ON_NOTIFICATION },
    { name: 'Notify on task stop', value: HookSelection.ON_STOP },
  ];
}

/**
 * Prompt for sound preference for selected notification types
 * @param selectedNotifications - Previously selected notification types
 * @returns Whether to enable sound
 */
async function promptSoundPreference(selectedNotifications: HookSelection[]): Promise<boolean> {
  const notificationNames = selectedNotifications
    .map(type => {
      switch (type) {
        case HookSelection.ON_NOTIFICATION:
          return 'completion';
        case HookSelection.ON_STOP:
          return 'stop';
        default:
          return 'unknown';
      }
    })
    .filter(name => name !== 'unknown');

  const message = `Add sound to ${notificationNames.join(' and ')} notification${notificationNames.length > 1 ? 's' : ''}?`;

  try {
    const result = await select({
      message,
      choices: [
        { name: '✅ Yes', value: true },
        { name: '❌ No', value: false },
      ],
      default: false,
    }, {
      clearPromptOnDone: true,
    });
    return result;
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError') {
      throw new UserCancelledError('Sound preference cancelled');
    }
    throw error;
  }
}

/**
 * Show two-step hook selection prompt
 * @returns Array of selected hook values
 * @throws UserCancelledError if user cancels the operation
 */
export async function promptHookSelection(): Promise<HookSelection[]> {
  // Step 1: Select notification types
  let selectedNotifications: HookSelection[];
  try {
    const notificationChoices = getNotificationChoices();
    selectedNotifications = await checkbox({
      message: 'Select notification types (Press <space> to toggle, <enter> to confirm)',
      choices: notificationChoices,
      theme: {
        helpMode: 'never',
      },
      loop: false,
      pageSize: 10,
    }, {
      clearPromptOnDone: true,
    }) as HookSelection[];

    if (selectedNotifications.length === 0) {
      throw new UserCancelledError('No notifications selected');
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError') {
      throw new UserCancelledError('Hook selection cancelled');
    }
    throw error;
  }

  // Step 2: Ask about sound (only if platform supports it)
  let enableSound = false;
  if (isSoundSupported()) {
    enableSound = await promptSoundPreference(selectedNotifications);
  }

  // Combine results
  const finalSelections = [...selectedNotifications];
  if (enableSound) {
    selectedNotifications.forEach(type => {
      if (type === HookSelection.ON_NOTIFICATION) {
        finalSelections.push(HookSelection.ON_NOTIFICATION_SOUND);
      } else if (type === HookSelection.ON_STOP) {
        finalSelections.push(HookSelection.ON_STOP_SOUND);
      }
    });
  }

  return finalSelections;
}

/**
 * Generate confirmation choices showing selected hooks
 * @param selectedHooks - Array of selected hook values
 * @returns Array of choice objects for confirmation prompt
 */
export function generateConfirmationChoices(selectedHooks: HookSelection[]): (Separator | PromptChoice)[] {
  const resultArray: Separator[] = [];

  // Show selected notification types
  const hasNotification = selectedHooks.includes(HookSelection.ON_NOTIFICATION);
  const hasStop = selectedHooks.includes(HookSelection.ON_STOP);
  const hasNotificationSound = selectedHooks.includes(HookSelection.ON_NOTIFICATION_SOUND);
  const hasStopSound = selectedHooks.includes(HookSelection.ON_STOP_SOUND);

  resultArray.push(new Separator('Selected Configuration:'));

  if (hasNotification) {
    const soundText = hasNotificationSound ? ' with sound 🔔' : '';
    resultArray.push(new Separator(`  [X] Task completion notification${soundText}`));
  }

  if (hasStop) {
    const soundText = hasStopSound ? ' with sound 🔔' : '';
    resultArray.push(new Separator(`  [X] Task stop notification${soundText}`));
  }

  if (!hasNotification && !hasStop) {
    resultArray.push(new Separator('  [ ] No notifications selected'));
  }

  return [
    new Separator(),
    ...resultArray,
    new Separator(),
    {
      name: '⚙️  Install Hook To Claude Code',
      value: ConfirmationAction.INSTALL,
    },
    {
      name: '❌ Exit',
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

  // Validate that all selected hooks are valid enum values
  const validHookValues = Object.values(HookSelection);
  const invalidHooks = selectedHooks.filter((hook) => !validHookValues.includes(hook));
  if (invalidHooks.length > 0) {
    errors.push(`Invalid hook values: ${invalidHooks.join(', ')}`);
  }

  // Validate logical consistency: sound hooks should have corresponding base hooks
  if (selectedHooks.includes(HookSelection.ON_NOTIFICATION_SOUND) && !selectedHooks.includes(HookSelection.ON_NOTIFICATION)) {
    errors.push('Sound for completion notification requires base notification to be enabled');
  }

  if (selectedHooks.includes(HookSelection.ON_STOP_SOUND) && !selectedHooks.includes(HookSelection.ON_STOP)) {
    errors.push('Sound for stop notification requires base notification to be enabled');
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

/**
 * Show main menu for application actions
 * @returns Selected main menu action
 * @throws UserCancelledError if user cancels the operation
 */
export async function promptMainMenu(): Promise<MainMenuAction> {
  const choices = [
    new Separator(),
    { name: '📋 View Current Configuration', value: MainMenuAction.VIEW_CONFIG },
    { name: '⚙️  Install Notifications', value: MainMenuAction.INSTALL_MODIFY },
    { name: '🗑️  Remove Notifications', value: MainMenuAction.REMOVE },
    { name: '❌ Exit', value: MainMenuAction.EXIT },
    new Separator(),
  ];

  try {
    const action = await select({
      message: 'Please select an action (Press <enter> to confirm)',
      choices,
      pageSize: 10,
      loop: false,
    });

    return action as MainMenuAction;
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError') {
      throw new UserCancelledError('Main menu cancelled');
    }
    throw error;
  }
}

/**
 * Display current configuration status
 * @param config - Configuration status to display
 */
export function displayConfiguration(config: ConfigurationStatus): void {
  console.log('\n📋 Current Configuration Status:');
  console.log('─'.repeat(50));

  if (!config.hasHooks) {
    console.log('❌ No notification hooks installed');
  } else {
    console.log('✅ Installed hooks:');

    if (config.notifications.enabled) {
      const soundText = config.notifications.hasSound ? ' (with sound 🔔)' : ' (silent)';
      console.log(`   • Task completion notification${soundText}`);
    }

    if (config.stop.enabled) {
      const soundText = config.stop.hasSound ? ' (with sound 🔔)' : ' (silent)';
      console.log(`   • Task stop notification${soundText}`);
    }
  }

  console.log(`\n🖥️ Platform: ${config.platform.name}`);
  console.log(`🔊 Sound Support: ${config.platform.soundSupported ? 'Yes' : 'No'}`);
  console.log(`📁 Settings File: ${config.settingsPath}`);
  console.log('─'.repeat(50));
}

/**
 * Prompt for removal selection
 * @param installedHooks - Array of currently installed hook names
 * @returns Array of selected hook names to remove
 * @throws UserCancelledError if user cancels the operation
 */
export async function promptRemovalSelection(installedHooks: string[]): Promise<string[]> {
  if (installedHooks.length === 0) {
    throw new UserCancelledError('No hooks installed to remove');
  }

  const choices = [
    new Separator(),
    new Separator('Select notification types to remove'),
    ...installedHooks.map(hookName => ({
      name: hookName === 'Notification' ? 'Task completion notification' : 'Task stop notification',
      value: hookName,
      checked: false,
    })),
  ];

  try {
    const selectedRemovals = await checkbox({
      message: 'Select notifications to remove (Press <space> to toggle, <enter> to confirm)',
      choices,
      theme: {
        helpMode: 'never',
      },
      loop: false,
      pageSize: 10,
    }) as string[];

    if (selectedRemovals.length === 0) {
      throw new UserCancelledError('No items selected for removal');
    }

    return selectedRemovals;
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError') {
      throw new UserCancelledError('Removal selection cancelled');
    }
    throw error;
  }
}

/**
 * Show confirmation prompt for removal
 * @param hooksToRemove - Array of hook names to be removed
 * @returns True if user confirms removal
 * @throws UserCancelledError if user cancels the operation
 */
export async function promptRemovalConfirmation(hooksToRemove: string[]): Promise<boolean> {
  const hookDisplayNames = hooksToRemove.map(hookName =>
    hookName === 'Notification' ? 'Task completion notification' : 'Task stop notification'
  );

  const choices = [
    new Separator(),
    new Separator('⚠️ Confirm Removal'),
    ...hookDisplayNames.map(name => new Separator(`  • ${name}`)),
    new Separator(),
    new Separator('This action cannot be undone!'),
    new Separator(),
    { name: '✅ Yes, remove these notifications', value: 'confirm' },
    { name: '❌ Cancel', value: 'cancel' },
  ];

  try {
    const result = await select({
      message: 'Are you sure you want to proceed?',
      choices,
      pageSize: 15,
      loop: false,
    });

    return result === 'confirm';
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError') {
      throw new UserCancelledError('Removal confirmation cancelled');
    }
    throw error;
  }
}
