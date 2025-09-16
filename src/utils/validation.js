import { InvalidInputError, CommandValidationError } from './errors.js';

/**
 * Security and validation utilities
 */
export class ValidationUtils {
    /**
     * Sanitize input for use in shell commands
     * @param {string} input - Input to sanitize
     * @returns {string} Sanitized input
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') {
            return '';
        }

        // Remove or escape dangerous characters
        return input
            .replace(/[`$"\\]/g, '') // Remove backticks, dollar signs, double quotes, backslashes
            .replace(/[^\w\s!?.-]/g, '') // Keep only alphanumeric, whitespace, and safe punctuation
            .trim();
    }

    /**
     * Sanitize input specifically for PowerShell commands
     * @param {string} input - Input to sanitize
     * @returns {string} Sanitized input safe for PowerShell
     */
    static sanitizeForPowerShell(input) {
        if (typeof input !== 'string') {
            return '';
        }

        return input
            .replace(/'/g, "''")  // Escape single quotes for PowerShell
            .replace(/[`$"\\]/g, '') // Remove backticks, dollar signs, double quotes, backslashes
            .replace(/[^\w\s!?.-]/g, '') // Keep only safe characters
            .trim();
    }

    /**
     * Sanitize input for use in AppleScript
     * @param {string} input - Input to sanitize
     * @returns {string} Sanitized input safe for AppleScript
     */
    static sanitizeForAppleScript(input) {
        if (typeof input !== 'string') {
            return '';
        }

        return input
            .replace(/['"\\]/g, '\\$&') // Escape quotes and backslashes
            .replace(/[\r\n]/g, ' ') // Replace line breaks with spaces
            .trim();
    }

    /**
     * Validate that a string is safe for command execution
     * @param {string} input - String to validate
     * @returns {boolean} True if the string is safe
     */
    static isStringSafe(input) {
        if (typeof input !== 'string') {
            return false;
        }

        // Check for dangerous patterns
        const dangerousPatterns = [
            /[;&|`$]/,           // Shell metacharacters
            /\.\./,              // Directory traversal
            /\/etc\/|\/bin\/|\/usr\//, // System directories
            /rm\s+/i,            // Remove commands
            /del\s+/i,           // Windows delete commands
            /format\s+/i,        // Format commands
            /shutdown/i,         // Shutdown commands
            /reboot/i,           // Reboot commands
            /wget|curl/i,        // Download commands
            /nc\s+|netcat/i,     // Network tools
        ];

        return !dangerousPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Validate command structure for known safe patterns
     * @param {string} command - Command to validate
     * @param {string} platform - Platform type ('macos', 'windows')
     * @returns {object} Validation result
     */
    static validateCommand(command, platform) {
        if (!command || typeof command !== 'string') {
            return {
                isValid: false,
                error: 'Command must be a non-empty string',
                code: 'INVALID_COMMAND_TYPE'
            };
        }

        // Basic safety check
        if (!this.isStringSafe(command)) {
            return {
                isValid: false,
                error: 'Command contains potentially dangerous patterns',
                code: 'UNSAFE_COMMAND'
            };
        }

        // Platform-specific validation
        switch (platform) {
            case 'macos':
                return this._validateMacOSCommand(command);
            case 'windows':
                return this._validateWindowsCommand(command);
            default:
                return {
                    isValid: false,
                    error: `Unknown platform: ${platform}`,
                    code: 'UNKNOWN_PLATFORM'
                };
        }
    }

    /**
     * Validate macOS osascript command
     * @param {string} command - Command to validate
     * @returns {object} Validation result
     * @private
     */
    static _validateMacOSCommand(command) {
        // Must start with osascript
        if (!command.startsWith('osascript -e \'display notification')) {
            return {
                isValid: false,
                error: 'macOS command must be an osascript display notification command',
                code: 'INVALID_MACOS_COMMAND'
            };
        }

        // Must end properly
        if (!command.endsWith('\'') && !command.endsWith('\'"')) {
            return {
                isValid: false,
                error: 'macOS command must be properly quoted',
                code: 'MALFORMED_MACOS_COMMAND'
            };
        }

        // Check for AppleScript injection
        const prohibitedPatterns = [
            /do\s+shell\s+script/i,
            /system\s+events/i,
            /tell\s+application/i,
            /run\s+script/i,
        ];

        if (prohibitedPatterns.some(pattern => pattern.test(command))) {
            return {
                isValid: false,
                error: 'Command contains prohibited AppleScript patterns',
                code: 'APPLESCRIPT_INJECTION'
            };
        }

        return { isValid: true };
    }

    /**
     * Validate Windows PowerShell command
     * @param {string} command - Command to validate
     * @returns {object} Validation result
     * @private
     */
    static _validateWindowsCommand(command) {
        // Must start with powershell
        if (!command.startsWith('powershell -NoProfile -Command "')) {
            return {
                isValid: false,
                error: 'Windows command must be a PowerShell command with -NoProfile',
                code: 'INVALID_WINDOWS_COMMAND'
            };
        }

        // Must end properly
        if (!command.endsWith('"')) {
            return {
                isValid: false,
                error: 'Windows command must be properly quoted',
                code: 'MALFORMED_WINDOWS_COMMAND'
            };
        }

        // Check for dangerous PowerShell patterns
        const prohibitedPatterns = [
            /Invoke-Expression/i,
            /IEX\s/i,
            /Invoke-Command/i,
            /Invoke-WebRequest/i,
            /Download/i,
            /WebClient/i,
            /Start-Process/i,
            /New-Object.*Process/i,
            /\$env:/i,
            /registry/i,
            /Get-Credential/i,
            /ConvertTo-SecureString/i,
            /Export-/i,
            /Import-Module/i,
            /Remove-/i,
            /Stop-/i,
            /Restart-/i,
        ];

        if (prohibitedPatterns.some(pattern => pattern.test(command))) {
            return {
                isValid: false,
                error: 'Command contains prohibited PowerShell patterns',
                code: 'POWERSHELL_INJECTION'
            };
        }

        return { isValid: true };
    }

    /**
     * Validate that an action string is safe
     * @param {string} action - Action string to validate
     * @throws {InvalidInputError} If action is invalid
     */
    static validateAction(action) {
        if (!action || typeof action !== 'string') {
            throw new InvalidInputError('Action must be a non-empty string');
        }

        if (action.length > 50) {
            throw new InvalidInputError('Action string is too long (maximum 50 characters)');
        }

        if (!this.isStringSafe(action)) {
            throw new InvalidInputError('Action contains invalid characters');
        }

        // Only allow alphanumeric characters, spaces, and basic punctuation
        if (!/^[a-zA-Z0-9\s!?.-]+$/.test(action)) {
            throw new InvalidInputError('Action contains invalid characters');
        }
    }

    /**
     * Validate a file path for safety
     * @param {string} filePath - File path to validate
     * @returns {boolean} True if path appears safe
     */
    static isPathSafe(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return false;
        }

        // Check for path traversal
        if (filePath.includes('..')) {
            return false;
        }

        // Check for absolute paths to system directories (basic check)
        const dangerousPaths = [
            '/etc/',
            '/bin/',
            '/usr/bin/',
            '/sbin/',
            '/usr/sbin/',
            'C:\\Windows\\',
            'C:\\Program Files\\',
            'C:\\Users\\',
        ];

        return !dangerousPaths.some(path => filePath.startsWith(path));
    }
}