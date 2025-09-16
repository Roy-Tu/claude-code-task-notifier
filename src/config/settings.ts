import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { SettingsError } from '../utils/errors.js';
import { getCurrentPlatform, isSoundSupported } from '../platforms/index.js';
import {
  ClaudeSettingsData,
  ClaudeHooks,
  SettingsOperation,
  ConfigurationStatus,
  Platform,
} from '../types/index.js';

/**
 * Manages Claude Code settings file operations
 */
export class ClaudeSettings {
  private readonly path: string;
  private data: ClaudeSettingsData | null = null;
  private _loaded = false;

  constructor(settingsPath?: string) {
    this.path = settingsPath ?? this._getDefaultSettingsPath();
  }

  /**
   * Get the default settings path
   * @returns Path to the settings file
   * @private
   */
  private _getDefaultSettingsPath(): string {
    const home = homedir();
    return path.join(home, '.claude', 'settings.json');
  }

  /**
   * Load settings from file
   * @returns The loaded settings data
   * @throws SettingsError if loading fails
   */
  async load(): Promise<ClaudeSettingsData> {
    try {
      if (existsSync(this.path)) {
        const content = readFileSync(this.path, 'utf-8');

        if (!content.trim()) {
          this.data = {};
        } else {
          try {
            this.data = JSON.parse(content) as ClaudeSettingsData;
          } catch (parseError) {
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            throw new SettingsError(
              `Invalid JSON in settings file: ${errorMessage}`,
              SettingsOperation.PARSE,
              this.path,
              { parseError: errorMessage }
            );
          }
        }
      } else {
        this.data = {};
      }

      this._loaded = true;
      return this.data;
    } catch (error) {
      if (error instanceof SettingsError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new SettingsError(
        `Failed to read settings file: ${errorMessage}`,
        SettingsOperation.READ,
        this.path,
        { originalError: errorMessage }
      );
    }
  }

  /**
   * Save settings to file
   * @param data - Optional data to save (uses current data if not provided)
   * @throws SettingsError if saving fails
   */
  async save(data?: ClaudeSettingsData): Promise<void> {
    if (data !== undefined) {
      this.data = data;
    }

    if (!this._loaded && this.data === null) {
      throw new SettingsError(
        'No data to save. Load settings first or provide data parameter.',
        SettingsOperation.WRITE,
        this.path
      );
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Validate data before writing
      this._validateSettings(this.data!);

      // Create backup of existing file
      await this._createBackup();

      // Write new settings
      const json = JSON.stringify(this.data, null, 2);
      writeFileSync(this.path, json, 'utf-8');
    } catch (error) {
      if (error instanceof SettingsError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new SettingsError(
        `Failed to write settings file: ${errorMessage}`,
        SettingsOperation.WRITE,
        this.path,
        { originalError: errorMessage }
      );
    }
  }

  /**
   * Create a backup of the current settings file
   * @private
   */
  private async _createBackup(): Promise<void> {
    if (existsSync(this.path)) {
      const backupPath = `${this.path}.backup`;
      try {
        const content = readFileSync(this.path, 'utf-8');
        writeFileSync(backupPath, content, 'utf-8');
      } catch (error) {
        // Backup failure is not critical, just log it
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Could not create backup: ${errorMessage}`);
      }
    }
  }

  /**
   * Validate settings data structure
   * @param data - Settings data to validate
   * @throws SettingsError if validation fails
   * @private
   */
  private _validateSettings(data: ClaudeSettingsData): void {
    if (data === null || typeof data !== 'object') {
      throw new SettingsError(
        'Settings data must be an object',
        SettingsOperation.VALIDATE,
        this.path,
        { data }
      );
    }

    // Validate hooks structure if present
    if (data.hooks) {
      if (typeof data.hooks !== 'object') {
        throw new SettingsError(
          'hooks must be an object',
          SettingsOperation.VALIDATE,
          this.path,
          { hooks: data.hooks }
        );
      }

      for (const [hookName, hookConfig] of Object.entries(data.hooks)) {
        if (!Array.isArray(hookConfig)) {
          throw new SettingsError(
            `Hook '${hookName}' must be an array`,
            SettingsOperation.VALIDATE,
            this.path,
            { hookName, hookConfig }
          );
        }

        for (const hookItem of hookConfig) {
          if (!hookItem.hooks || !Array.isArray(hookItem.hooks)) {
            throw new SettingsError(
              `Hook '${hookName}' items must have a 'hooks' array`,
              SettingsOperation.VALIDATE,
              this.path,
              { hookName, hookItem }
            );
          }
        }
      }
    }
  }

  /**
   * Merge new hooks into existing settings
   * @param newHooks - New hooks to merge
   * @throws SettingsError if merging fails
   */
  async mergeHooks(newHooks: ClaudeHooks): Promise<void> {
    if (!this._loaded) {
      await this.load();
    }

    if (!newHooks || typeof newHooks !== 'object') {
      throw new SettingsError(
        'newHooks must be an object',
        SettingsOperation.MERGE_HOOKS,
        this.path,
        { newHooks }
      );
    }

    // Initialize hooks if not present
    if (!this.data!.hooks) {
      this.data!.hooks = {};
    }

    // Merge new hooks
    this.data!.hooks = { ...this.data!.hooks, ...newHooks };

    // Validate the merged result
    this._validateSettings(this.data!);
  }

  /**
   * Get current settings data
   * @returns Current settings data
   * @throws SettingsError if settings not loaded
   */
  getData(): ClaudeSettingsData {
    if (!this._loaded) {
      throw new SettingsError(
        'Settings not loaded. Call load() first.',
        SettingsOperation.GET_DATA,
        this.path
      );
    }
    return this.data!;
  }

  /**
   * Get hooks from settings
   * @returns Hooks object
   * @throws SettingsError if settings not loaded
   */
  getHooks(): ClaudeHooks {
    if (!this._loaded) {
      throw new SettingsError(
        'Settings not loaded. Call load() first.',
        SettingsOperation.GET_HOOKS,
        this.path
      );
    }
    return this.data!.hooks ?? {};
  }

  /**
   * Check if settings file exists
   * @returns True if file exists
   */
  exists(): boolean {
    return existsSync(this.path);
  }

  /**
   * Get the settings file path
   * @returns Path to settings file
   */
  getPath(): string {
    return this.path;
  }

  /**
   * Remove specific hooks from settings
   * @param hookNames - Array of hook names to remove
   */
  async removeHooks(hookNames: string[]): Promise<void> {
    if (!this._loaded) {
      await this.load();
    }

    if (!Array.isArray(hookNames)) {
      throw new SettingsError(
        'hookNames must be an array',
        SettingsOperation.REMOVE_HOOKS,
        this.path,
        { hookNames }
      );
    }

    if (!this.data!.hooks) {
      // No hooks to remove
      return;
    }

    // Remove specified hooks
    for (const hookName of hookNames) {
      if (this.data!.hooks[hookName]) {
        delete this.data!.hooks[hookName];
      }
    }

    // Clean up empty hooks object
    if (Object.keys(this.data!.hooks).length === 0) {
      delete this.data!.hooks;
    }

    this._validateSettings(this.data!);
  }

  /**
   * Remove all hooks from settings
   */
  async removeAllHooks(): Promise<void> {
    if (!this._loaded) {
      await this.load();
    }

    if (this.data!.hooks) {
      delete this.data!.hooks;
    }

    this._validateSettings(this.data!);
  }

  /**
   * Check if any hooks are installed
   * @returns True if hooks exist
   */
  hasHooks(): boolean {
    if (!this._loaded) {
      throw new SettingsError(
        'Settings not loaded. Call load() first.',
        SettingsOperation.GET_HOOKS,
        this.path
      );
    }
    return Boolean(this.data!.hooks && Object.keys(this.data!.hooks).length > 0);
  }

  /**
   * Get list of installed hook names
   * @returns Array of hook names
   */
  getInstalledHookNames(): string[] {
    if (!this._loaded) {
      throw new SettingsError(
        'Settings not loaded. Call load() first.',
        SettingsOperation.GET_HOOKS,
        this.path
      );
    }
    return this.data!.hooks ? Object.keys(this.data!.hooks) : [];
  }

  /**
   * Check if specific hook is installed
   * @param hookName - Name of the hook to check
   * @returns True if hook exists
   */
  hasHook(hookName: string): boolean {
    if (!this._loaded) {
      throw new SettingsError(
        'Settings not loaded. Call load() first.',
        SettingsOperation.GET_HOOKS,
        this.path
      );
    }
    return this.data!.hooks ? hookName in this.data!.hooks : false;
  }

  /**
   * Analyze current configuration and return status
   * @returns Configuration status information
   */
  async analyzeConfiguration(): Promise<ConfigurationStatus> {
    if (!this._loaded) {
      await this.load();
    }

    const installedHooks = this.getInstalledHookNames();
    const hasHooks = installedHooks.length > 0;

    // Analyze notification hook
    const notifications = {
      enabled: this.hasHook('Notification'),
      hasSound: false,
    };

    if (notifications.enabled) {
      notifications.hasSound = this._detectSoundInHook('Notification');
    }

    // Analyze stop hook
    const stop = {
      enabled: this.hasHook('Stop'),
      hasSound: false,
    };

    if (stop.enabled) {
      stop.hasSound = this._detectSoundInHook('Stop');
    }

    // Get platform information
    let platformName = 'Unknown';
    let soundSupported = false;

    try {
      const currentPlatform = getCurrentPlatform();
      soundSupported = isSoundSupported();

      switch (currentPlatform) {
        case Platform.MACOS:
          platformName = 'macOS';
          break;
        case Platform.WINDOWS:
          platformName = 'Windows';
          break;
        default:
          platformName = 'Unknown';
      }
    } catch {
      // Platform detection failed, keep defaults
    }

    return {
      hasHooks,
      installedHooks,
      notifications,
      stop,
      platform: {
        name: platformName,
        soundSupported,
      },
      settingsPath: this.path,
    };
  }

  /**
   * Detect if a specific hook has sound functionality
   * @param hookName - Name of the hook to check
   * @returns True if hook contains sound commands
   * @private
   */
  private _detectSoundInHook(hookName: string): boolean {
    if (!this.data!.hooks || !this.data!.hooks[hookName]) {
      return false;
    }

    const hookGroups = this.data!.hooks[hookName];
    if (!hookGroups || hookGroups.length === 0) {
      return false;
    }

    // Check all hooks in all groups for sound indicators
    for (const group of hookGroups) {
      if (group.hooks) {
        for (const hook of group.hooks) {
          if (hook.command && this._containsSoundCommand(hook.command)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if a command contains sound functionality
   * @param command - Command string to check
   * @returns True if command contains sound
   * @private
   */
  private _containsSoundCommand(command: string): boolean {
    // Check for macOS sound patterns
    if (command.includes('sound name') || command.includes('with sound')) {
      return true;
    }

    // Add patterns for other platforms if needed in the future
    // Windows currently doesn't support sound

    return false;
  }
}