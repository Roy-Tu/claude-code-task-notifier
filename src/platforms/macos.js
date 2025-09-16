import { platform } from 'os';
import { NotificationPlatform } from './base.js';

/**
 * macOS notification platform implementation using osascript
 */
export class MacOSPlatform extends NotificationPlatform {
    static isSupported() {
        return platform() === 'darwin';
    }

    static getPlatformId() {
        return 'macos';
    }

    static createCommand(action, withSound = false) {
        if (!action || typeof action !== 'string') {
            throw new Error('Action must be a non-empty string');
        }

        // Sanitize the action for AppleScript
        const sanitizedAction = action.replace(/['"\\]/g, '\\$&');

        const soundPart = withSound ? ' sound name "Ping"' : '';

        return `osascript -e 'display notification "Claude Task ${sanitizedAction}!" with title "Claude Code"${soundPart}'`;
    }

}