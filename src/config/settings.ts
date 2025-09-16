import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { SettingsError } from '../utils/errors.js';
import {
  ClaudeSettingsData,
  ClaudeHooks,
  SettingsOperation,
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
}