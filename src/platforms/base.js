/**
 * Abstract base class for notification platforms
 */
export class NotificationPlatform {
    /**
     * Check if this platform is supported on the current system
     * @returns {boolean}
     */
    static isSupported() {
        throw new Error('isSupported() must be implemented by subclass');
    }

    /**
     * Get the platform identifier
     * @returns {string}
     */
    static getPlatformId() {
        throw new Error('getPlatformId() must be implemented by subclass');
    }

    /**
     * Create a notification command for the given action
     * @param {string} action - The action that occurred (e.g., 'Completed', 'Stopped')
     * @param {boolean} withSound - Whether to include sound in the notification
     * @returns {string} The command to execute
     */
    static createCommand(action, withSound = false) {
        throw new Error('createCommand() must be implemented by subclass');
    }

}