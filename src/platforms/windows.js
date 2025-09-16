import { platform } from 'os';
import { NotificationPlatform } from './base.js';

/**
 * Windows notification platform implementation using PowerShell
 */
export class WindowsPlatform extends NotificationPlatform {
    static isSupported() {
        return platform() === 'win32';
    }

    static getPlatformId() {
        return 'windows';
    }

    static createCommand(action, withSound = false) {
        if (!action || typeof action !== 'string') {
            throw new Error('Action must be a non-empty string');
        }

        // Sanitize inputs for PowerShell
        const sanitizedAction = this._sanitizeForPowerShell(action);
        const title = 'Claude Code';
        const message = `Claude Task ${sanitizedAction}!`;

        // PowerShell command to create balloon tip notification
        const psCommand = [
            'Add-Type -AssemblyName System.Windows.Forms',
            '$balloon = New-Object System.Windows.Forms.NotifyIcon',
            '$path = (Get-Process -Id $pid).Path',
            '$balloon.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)',
            '$balloon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Warning',
            `$balloon.BalloonTipText = '${this._sanitizeForPowerShell(message)}'`,
            `$balloon.BalloonTipTitle = '${this._sanitizeForPowerShell(title)}'`,
            '$balloon.Visible = $true',
            '$balloon.ShowBalloonTip(5000)'
        ].join('; ');

        return `powershell -NoProfile -Command "${psCommand}"`;
    }

    /**
     * Sanitize input for PowerShell command construction
     * @param {string} input - The input to sanitize
     * @returns {string} Sanitized input
     * @private
     */
    static _sanitizeForPowerShell(input) {
        if (typeof input !== 'string') {
            return '';
        }

        // Escape single quotes and remove potentially dangerous characters
        return input
            .replace(/'/g, "''")  // Escape single quotes for PowerShell
            .replace(/[`$"\\]/g, '') // Remove backticks, dollar signs, double quotes, backslashes
            .replace(/[^\w\s!?.-]/g, ''); // Keep only safe characters
    }

    static validate(command) {
        if (!super.validate(command)) {
            return false;
        }

        // Additional Windows-specific validation
        if (!command.startsWith('powershell -NoProfile -Command "')) {
            return false;
        }

        // Ensure the command ends properly
        if (!command.endsWith('"')) {
            return false;
        }

        // Check for dangerous PowerShell patterns
        const dangerousPatterns = [
            /Invoke-Expression/i,
            /IEX\s/i,
            /Download/i,
            /WebClient/i,
            /Start-Process/i,
            /\$env:/i,
            /registry/i,
            /Get-Credential/i
        ];

        // Additional check: if command contains New-Object, it must be for NotifyIcon
        if (command.includes('New-Object') && !command.includes('System.Windows.Forms.NotifyIcon')) {
            return false;
        }

        return !dangerousPatterns.some(pattern => pattern.test(command));
    }
}