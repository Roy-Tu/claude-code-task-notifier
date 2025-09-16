import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { SettingsError } from '../utils/errors.js';

/**
 * Manages Claude Code settings file operations
 */
export class ClaudeSettings {
    constructor(settingsPath = null) {
        this.path = settingsPath || this._getDefaultSettingsPath();
        this.data = null;
        this._loaded = false;
    }

    /**
     * Get the default settings path
     * @returns {string} Path to the settings file
     * @private
     */
    _getDefaultSettingsPath() {
        const home = homedir();
        return path.join(home, '.claude', 'settings.json');
    }

    /**
     * Load settings from file
     * @returns {Promise<object>} The loaded settings data
     * @throws {SettingsError} If loading fails
     */
    async load() {
        try {
            if (existsSync(this.path)) {
                const content = readFileSync(this.path, 'utf-8');

                if (!content.trim()) {
                    this.data = {};
                } else {
                    try {
                        this.data = JSON.parse(content);
                    } catch (parseError) {
                        throw new SettingsError(
                            `Invalid JSON in settings file: ${parseError.message}`,
                            'parse',
                            this.path,
                            { parseError: parseError.message }
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

            throw new SettingsError(
                `Failed to read settings file: ${error.message}`,
                'read',
                this.path,
                { originalError: error.message }
            );
        }
    }

    /**
     * Save settings to file
     * @param {object} data - Optional data to save (uses current data if not provided)
     * @returns {Promise<void>}
     * @throws {SettingsError} If saving fails
     */
    async save(data = null) {
        if (data !== null) {
            this.data = data;
        }

        if (!this._loaded && this.data === null) {
            throw new SettingsError(
                'No data to save. Load settings first or provide data parameter.',
                'save',
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
            this._validateSettings(this.data);

            // Create backup of existing file
            await this._createBackup();

            // Write new settings
            const json = JSON.stringify(this.data, null, 2);
            writeFileSync(this.path, json, 'utf-8');

        } catch (error) {
            if (error instanceof SettingsError) {
                throw error;
            }

            throw new SettingsError(
                `Failed to write settings file: ${error.message}`,
                'write',
                this.path,
                { originalError: error.message }
            );
        }
    }

    /**
     * Create a backup of the current settings file
     * @returns {Promise<void>}
     * @private
     */
    async _createBackup() {
        if (existsSync(this.path)) {
            const backupPath = `${this.path}.backup`;
            try {
                const content = readFileSync(this.path, 'utf-8');
                writeFileSync(backupPath, content, 'utf-8');
            } catch (error) {
                // Backup failure is not critical, just log it
                console.warn(`Warning: Could not create backup: ${error.message}`);
            }
        }
    }

    /**
     * Validate settings data structure
     * @param {object} data - Settings data to validate
     * @throws {SettingsError} If validation fails
     * @private
     */
    _validateSettings(data) {
        if (data === null || typeof data !== 'object') {
            throw new SettingsError(
                'Settings data must be an object',
                'validate',
                this.path,
                { data }
            );
        }

        // Validate hooks structure if present
        if (data.hooks) {
            if (typeof data.hooks !== 'object') {
                throw new SettingsError(
                    'hooks must be an object',
                    'validate',
                    this.path,
                    { hooks: data.hooks }
                );
            }

            for (const [hookName, hookConfig] of Object.entries(data.hooks)) {
                if (!Array.isArray(hookConfig)) {
                    throw new SettingsError(
                        `Hook '${hookName}' must be an array`,
                        'validate',
                        this.path,
                        { hookName, hookConfig }
                    );
                }

                for (const hookItem of hookConfig) {
                    if (!hookItem.hooks || !Array.isArray(hookItem.hooks)) {
                        throw new SettingsError(
                            `Hook '${hookName}' items must have a 'hooks' array`,
                            'validate',
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
     * @param {object} newHooks - New hooks to merge
     * @returns {Promise<void>}
     * @throws {SettingsError} If merging fails
     */
    async mergeHooks(newHooks) {
        if (!this._loaded) {
            await this.load();
        }

        if (!newHooks || typeof newHooks !== 'object') {
            throw new SettingsError(
                'newHooks must be an object',
                'mergeHooks',
                this.path,
                { newHooks }
            );
        }

        // Initialize hooks if not present
        if (!this.data.hooks) {
            this.data.hooks = {};
        }

        // Merge new hooks
        this.data.hooks = { ...this.data.hooks, ...newHooks };

        // Validate the merged result
        this._validateSettings(this.data);
    }

    /**
     * Get current settings data
     * @returns {object} Current settings data
     */
    getData() {
        if (!this._loaded) {
            throw new SettingsError(
                'Settings not loaded. Call load() first.',
                'getData',
                this.path
            );
        }
        return this.data;
    }

    /**
     * Get hooks from settings
     * @returns {object} Hooks object
     */
    getHooks() {
        if (!this._loaded) {
            throw new SettingsError(
                'Settings not loaded. Call load() first.',
                'getHooks',
                this.path
            );
        }
        return this.data.hooks || {};
    }

    /**
     * Check if settings file exists
     * @returns {boolean} True if file exists
     */
    exists() {
        return existsSync(this.path);
    }

    /**
     * Get the settings file path
     * @returns {string} Path to settings file
     */
    getPath() {
        return this.path;
    }
}