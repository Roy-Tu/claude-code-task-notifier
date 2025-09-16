#!/usr/bin/env node

import { Terminal } from './src/cli/terminal.js';
import { promptHookSelection, promptConfirmation, validateHookSelection, parseHookSelection } from './src/cli/prompts.js';
import { ClaudeSettings } from './src/config/settings.js';
import { createNotificationCommand, isNotificationSupported } from './src/platforms/index.js';
import { handleError, UserCancelledError, UnsupportedPlatformError, InvalidInputError } from './src/utils/errors.js';
import {
  HookConfiguration,
  ClaudeHooks,
  ClaudeHookGroup,
  HookType,
  HookAction,
  ConfirmationAction,
} from './src/types/index.js';

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
  } catch (error) {
    handleError(error as Error, true);
  }
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