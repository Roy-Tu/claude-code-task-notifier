import { Platform, HookAction } from '../types/index.js';

/**
 * Abstract base class for notification platforms
 */
export abstract class NotificationPlatform {
  /**
   * Check if this platform is supported on the current system
   * @returns True if platform is supported
   */
  static isSupported(): boolean {
    throw new Error('isSupported() must be implemented by subclass');
  }

  /**
   * Get the platform identifier
   * @returns Platform identifier
   */
  static getPlatformId(): Platform {
    throw new Error('getPlatformId() must be implemented by subclass');
  }

  /**
   * Create a notification command for the given action
   * @param action - The action that occurred (e.g., 'Completed', 'Stopped')
   * @param withSound - Whether to include sound in the notification
   * @returns The command to execute
   */
  static createCommand(_action: HookAction | string, _withSound = false): string {
    throw new Error('createCommand() must be implemented by subclass');
  }
}