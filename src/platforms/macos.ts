import { platform } from 'os';
import { NotificationPlatform } from './base.js';
import { Platform, HookAction } from '../types/index.js';

/**
 * macOS notification platform implementation using osascript
 */
export class MacOSPlatform extends NotificationPlatform {
  static override isSupported(): boolean {
    return platform() === 'darwin';
  }

  static override getPlatformId(): Platform {
    return Platform.MACOS;
  }

  static override createCommand(action: HookAction | string, withSound = false): string {
    if (!action || typeof action !== 'string') {
      throw new Error('Action must be a non-empty string');
    }

    // Sanitize the action for AppleScript
    const sanitizedAction = action.replace(/['"\\]/g, '\\$&');

    const soundPart = withSound ? ' sound name "Ping"' : '';

    return `osascript -e 'display notification "Claude Task ${sanitizedAction}!" with title "Claude Code"${soundPart}'`;
  }
}