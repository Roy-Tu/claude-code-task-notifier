#!/usr/bin/env node

import { Terminal } from './cli/terminal.js';
import { select } from '@inquirer/prompts';
import {
  promptHookSelection,
  promptConfirmation,
  validateHookSelection,
  parseHookSelection,
  promptMainMenu,
  displayConfiguration,
  promptRemovalSelection,
  promptRemovalConfirmation,
} from './cli/prompts.js';
import { ClaudeSettings } from './config/settings.js';
import { createNotificationCommand, isNotificationSupported } from './platforms/index.js';
import { handleError, UserCancelledError, UnsupportedPlatformError, InvalidInputError } from './utils/errors.js';
import {
  HookConfiguration,
  ClaudeHooks,
  ClaudeHookGroup,
  HookType,
  HookAction,
  ConfirmationAction,
  MainMenuAction,
} from './types/index.js';

/**
 * Main application function
 */
async function main(): Promise<void> {
  try {
    // Setup terminal
    Terminal.setup();
    Terminal.printHeader('Claude Code Task Notifier');

    // Check platform support
    if (!isNotificationSupported()) {
      throw new UnsupportedPlatformError();
    }

    // Main application loop
    while (true) {
      try {
        const action = await promptMainMenu();

        switch (action) {
          case MainMenuAction.VIEW_CONFIG:
            await handleViewConfiguration();
            break;

          case MainMenuAction.INSTALL_MODIFY:
            await handleInstallModify();
            break;

          case MainMenuAction.REMOVE:
            await handleRemove();
            break;

          case MainMenuAction.EXIT:
            Terminal.printInfo('Goodbye!');
            return;

          default:
            Terminal.printError('Unknown option');
        }

        // Ask if user wants to continue to main menu
        try {
          const result = await select({
            message: 'What would you like to do next?',
            choices: [
              { name: '🔙 Return to main menu', value: 'menu' },
              { name: '❌ Exit application', value: 'exit' },
            ],
            loop: false,
          });

          if (result === 'exit') {
            Terminal.printInfo('Goodbye!');
            return;
          }

          // Clear screen before showing main menu again
          Terminal.clearScreen();
          Terminal.printHeader('Claude Code Task Notifier');
        } catch (error) {
          // User cancelled (Ctrl+C), exit gracefully
          Terminal.printInfo('Goodbye!');
          return;
        }

      } catch (error) {
        if (error instanceof UserCancelledError) {
          // User cancelled current operation, return to main menu
          Terminal.clearScreen();
          Terminal.printHeader('Claude Code Task Notifier');
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    handleError(error as Error, true);
  }
}

/**
 * Handle view configuration action
 */
async function handleViewConfiguration(): Promise<void> {
  Terminal.clearScreen();
  Terminal.printHeader('Claude Code Task Notifier');

  const settings = new ClaudeSettings();
  const config = await settings.analyzeConfiguration();
  displayConfiguration(config);
}

/**
 * Handle install/modify action (original installation logic)
 */
async function handleInstallModify(): Promise<void> {
  Terminal.clearScreen();
  Terminal.printHeader('Claude Code Task Notifier');

  // Get hook selection from user
  const selectedHooks = await promptHookSelection();

  // Validate selection
  const validation = validateHookSelection(selectedHooks);
  if (!validation.isValid) {
    throw new InvalidInputError(validation.errors.join('; '));
  }

  // Show confirmation
  const action = await promptConfirmation(selectedHooks);

  if (action === ConfirmationAction.EXIT) {
    throw new UserCancelledError('Installation cancelled');
  }

  // Parse hook configuration
  const config = parseHookSelection(selectedHooks);

  // Generate hooks
  const newHooks = await generateHooks(config);

  // Save to settings
  await saveHooksToSettings(newHooks);

  Terminal.printSuccess('Hooks installed successfully!');
}

/**
 * Handle remove action
 */
async function handleRemove(): Promise<void> {
  Terminal.clearScreen();
  Terminal.printHeader('Claude Code Task Notifier');

  const settings = new ClaudeSettings();
  await settings.load();

  const installedHooks = settings.getInstalledHookNames();
  if (installedHooks.length === 0) {
    Terminal.printInfo('No hooks are currently installed');
    return;
  }

  // Simply show which hooks are available for removal
  console.log(`
🗑️ Found ${installedHooks.length} notification(s) to remove`);

  // Prompt for removal selection
  const hooksToRemove = await promptRemovalSelection(installedHooks);

  // Confirm removal
  const confirmed = await promptRemovalConfirmation(hooksToRemove);
  if (!confirmed) {
    throw new UserCancelledError('Removal cancelled');
  }

  // Remove hooks
  await settings.removeHooks(hooksToRemove);
  await settings.save();

  Terminal.printSuccess(`Successfully removed ${hooksToRemove.length} hook(s)!`);
}

/**
 * Generate hook configuration from user preferences
 * @param config - Parsed hook configuration
 * @returns Generated hooks object
 */
async function generateHooks(config: HookConfiguration): Promise<ClaudeHooks> {
  const newHooks: ClaudeHooks = {};

  if (config.notificationEnabled) {
    try {
      const command = createNotificationCommand(HookAction.COMPLETED, config.notificationWithSound);

      const hookGroup: ClaudeHookGroup = {
        hooks: [
          {
            type: HookType.COMMAND,
            command: command,
          },
        ],
      };

      newHooks.Notification = [hookGroup];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create notification hook: ${errorMessage}`);
    }
  }

  if (config.stopEnabled) {
    try {
      const command = createNotificationCommand(HookAction.STOPPED, config.stopWithSound);

      const hookGroup: ClaudeHookGroup = {
        hooks: [
          {
            type: HookType.COMMAND,
            command: command,
          },
        ],
      };

      newHooks.Stop = [hookGroup];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create stop hook: ${errorMessage}`);
    }
  }

  return newHooks;
}

/**
 * Save hooks to Claude settings file
 * @param newHooks - Hooks to save
 */
async function saveHooksToSettings(newHooks: ClaudeHooks): Promise<void> {
  const settings = new ClaudeSettings();

  try {
    await settings.load();
    await settings.mergeHooks(newHooks);
    await settings.save();

    Terminal.printInfo(`Settings saved to: ${settings.getPath()}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save settings: ${errorMessage}`);
  }
}

// Run the application
main().catch((error: Error) => {
  console.error('Unhandled error in main application:', error);
  process.exit(1);
});
