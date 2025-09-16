import { MacOSPlatform } from './macos.js';
import { WindowsPlatform } from './windows.js';
import { NotificationPlatform } from './base.js';
import { Platform, HookAction } from '../types/index.js';

/**
 * Type for platform class constructors
 */
type PlatformClass = typeof NotificationPlatform & {
  isSupported(): boolean;
  getPlatformId(): Platform;
  createCommand(action: HookAction | string, withSound?: boolean): string;
};

/**
 * Registry for notification platforms
 */
export class PlatformRegistry {
  private static platforms = new Map<Platform, PlatformClass>([
    [Platform.MACOS, MacOSPlatform as PlatformClass],
    [Platform.WINDOWS, WindowsPlatform as PlatformClass],
  ]);

  /**
   * Register a new platform
   * @param name - Platform name
   * @param platformClass - Platform class extending NotificationPlatform
   */
  static register(name: Platform, platformClass: PlatformClass): void {
    this.platforms.set(name, platformClass);
  }

  /**
   * Get all registered platforms
   * @returns Map of platform names to classes
   */
  static getAllPlatforms(): Map<Platform, PlatformClass> {
    return new Map(this.platforms);
  }

  /**
   * Get the first supported platform for the current system
   * @returns Platform class that supports the current system
   * @throws Error if no supported platform is found
   */
  static getSupportedPlatform(): PlatformClass {
    for (const [_name, PlatformClass] of this.platforms) {
      if (PlatformClass.isSupported()) {
        return PlatformClass;
      }
    }

    throw new Error('No supported notification platform found for this operating system');
  }

  /**
   * Check if any platform is supported on the current system
   * @returns True if at least one platform is supported
   */
  static isAnyPlatformSupported(): boolean {
    try {
      this.getSupportedPlatform();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get platform by name
   * @param name - Platform name
   * @returns Platform class or null if not found
   */
  static getPlatform(name: Platform): PlatformClass | null {
    return this.platforms.get(name) ?? null;
  }

  /**
   * List all supported platform names for the current system
   * @returns Array of supported platform names
   */
  static getSupportedPlatformNames(): Platform[] {
    const supported: Platform[] = [];
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
 * @param action - The action that occurred
 * @param withSound - Whether to include sound
 * @returns The notification command
 * @throws Error if no supported platform is found
 */
export function createNotificationCommand(action: HookAction | string, withSound = false): string {
  const Platform = PlatformRegistry.getSupportedPlatform();
  return Platform.createCommand(action, withSound);
}

/**
 * Check if notifications are supported on this system
 * @returns True if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return PlatformRegistry.isAnyPlatformSupported();
}