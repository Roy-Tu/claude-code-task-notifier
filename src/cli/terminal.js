/**
 * Terminal management utilities for Claude Code Hook Notifier
 */
export class Terminal {
    static _alternateScreenActive = false;

    /**
     * Enter alternate screen buffer and clear screen
     */
    static enterAlternateScreen() {
        console.log('\x1b[?1049h\x1b[2J\x1b[H');
        this._alternateScreenActive = true;
    }

    /**
     * Exit alternate screen buffer
     */
    static exitAlternateScreen() {
        console.log('\x1b[?1049l');
        this._alternateScreenActive = false;
    }

    /**
     * Clear the current screen
     */
    static clearScreen() {
        console.log('\x1b[2J\x1b[H');
    }

    /**
     * Set up terminal for the application
     * - Enters alternate screen buffer
     * - Sets up exit handlers to restore terminal
     */
    static setup() {
        this.enterAlternateScreen();

        // Ensure exit sequence is always called to restore the terminal
        this._setupExitHandlers();
    }

    /**
     * Setup handlers to restore terminal on exit
     * @private
     */
    static _setupExitHandlers() {
        // Normal exit
        process.on('exit', () => {
            if (this._alternateScreenActive) {
                this.exitAlternateScreen();
            }
        });

        // Catch interrupt signal (Ctrl+C)
        process.on('SIGINT', () => {
            if (this._alternateScreenActive) {
                this.exitAlternateScreen();
            }
            process.exit(130); // Standard exit code for SIGINT
        });

        // Catch terminate signal
        process.on('SIGTERM', () => {
            if (this._alternateScreenActive) {
                this.exitAlternateScreen();
            }
            process.exit(143); // Standard exit code for SIGTERM
        });

        // Catch uncaught exceptions
        process.on('uncaughtException', (error) => {
            if (this._alternateScreenActive) {
                this.exitAlternateScreen();
            }
            console.error('Uncaught Exception:', error);
            process.exit(1);
        });

        // Catch unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            if (this._alternateScreenActive) {
                this.exitAlternateScreen();
            }
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
    }

    /**
     * Restore terminal to normal state
     */
    static restore() {
        if (this._alternateScreenActive) {
            this.exitAlternateScreen();
        }
    }

    /**
     * Check if alternate screen is currently active
     * @returns {boolean} True if alternate screen is active
     */
    static isAlternateScreenActive() {
        return this._alternateScreenActive;
    }

    /**
     * Print a header with separators
     * @param {string} title - The title to display
     * @param {string} separator - Character to use for separation (default: '─')
     * @param {number} width - Width of the header (default: 25)
     */
    static printHeader(title, separator = '─', width = 25) {
        const separatorLine = separator.repeat(width);
        console.log(separatorLine);
        console.log(title);
        console.log(separatorLine);
    }

    /**
     * Print a success message
     * @param {string} message - The success message
     */
    static printSuccess(message) {
        console.log(`✅ ${message}`);
    }

    /**
     * Print an error message
     * @param {string} message - The error message
     */
    static printError(message) {
        console.error(`❌ ${message}`);
    }

    /**
     * Print a warning message
     * @param {string} message - The warning message
     */
    static printWarning(message) {
        console.warn(`⚠️  ${message}`);
    }

    /**
     * Print an info message
     * @param {string} message - The info message
     */
    static printInfo(message) {
        console.log(`ℹ️  ${message}`);
    }
}