import { MacOSPlatform } from './macos.js';
import { WindowsPlatform } from './windows.js';

/**
 * Registry for notification platforms
 */
export class PlatformRegistry {
    static platforms = new Map([
        ['macos', MacOSPlatform],
        ['windows', WindowsPlatform]
    ]);

    /**
     * Register a new platform
     * @param {string} name - Platform name
     * @param {class} platformClass - Platform class extending NotificationPlatform
     */
    static register(name, platformClass) {
        this.platforms.set(name, platformClass);
    }

    /**
     * Get all registered platforms
     * @returns {Map<string, class>} Map of platform names to classes
     */
    static getAllPlatforms() {
        return new Map(this.platforms);
    }

    /**
     * Get the first supported platform for the current system
     * @returns {class} Platform class that supports the current system
     * @throws {Error} If no supported platform is found
     */
    static getSupportedPlatform() {
        for (const [name, PlatformClass] of this.platforms) {
            if (PlatformClass.isSupported()) {
                return PlatformClass;
            }
        }

        throw new Error('No supported notification platform found for this operating system');
    }

    /**
     * Check if any platform is supported on the current system
     * @returns {boolean} True if at least one platform is supported
     */
    static isAnyPlatformSupported() {
        try {
            this.getSupportedPlatform();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get platform by name
     * @param {string} name - Platform name
     * @returns {class|null} Platform class or null if not found
     */
    static getPlatform(name) {
        return this.platforms.get(name) || null;
    }

    /**
     * List all supported platform names for the current system
     * @returns {string[]} Array of supported platform names
     */
    static getSupportedPlatformNames() {
        const supported = [];
        for (const [name, PlatformClass] of this.platforms) {
            if (PlatformClass.isSupported()) {
                supported.push(name);
            }
        }
        return supported;
    }
}

/**
 * Factory function to create notification commands
 * @param {string} action - The action that occurred
 * @param {boolean} withSound - Whether to include sound
 * @returns {string} The notification command
 * @throws {Error} If no supported platform is found
 */
export function createNotificationCommand(action, withSound = false) {
    const Platform = PlatformRegistry.getSupportedPlatform();
    return Platform.createCommand(action, withSound);
}

/**
 * Check if notifications are supported on this system
 * @returns {boolean} True if notifications are supported
 */
export function isNotificationSupported() {
    return PlatformRegistry.isAnyPlatformSupported();
}