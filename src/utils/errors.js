/**
 * Base error class for Claude Notifier errors
 */
export class ClaudeNotifierError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR', details = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;

        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Convert error to JSON representation
     * @returns {object} JSON representation of the error
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            stack: this.stack
        };
    }
}

/**
 * Error thrown when platform is not supported
 */
export class UnsupportedPlatformError extends ClaudeNotifierError {
    constructor(platform = null, details = {}) {
        const message = platform
            ? `Platform '${platform}' is not supported`
            : 'No supported notification platform found for this operating system';

        super(message, 'UNSUPPORTED_PLATFORM', { platform, ...details });
    }
}

/**
 * Error thrown when settings file operations fail
 */
export class SettingsError extends ClaudeNotifierError {
    constructor(message, operation = null, path = null, details = {}) {
        super(message, 'SETTINGS_ERROR', { operation, path, ...details });
        this.operation = operation;
        this.path = path;
    }
}

/**
 * Error thrown when command validation fails
 */
export class CommandValidationError extends ClaudeNotifierError {
    constructor(command, reason = null, details = {}) {
        const message = reason
            ? `Command validation failed: ${reason}`
            : 'Generated command failed validation';

        super(message, 'COMMAND_VALIDATION_ERROR', { command, reason, ...details });
        this.command = command;
        this.reason = reason;
    }
}

/**
 * Error thrown when user input is invalid
 */
export class InvalidInputError extends ClaudeNotifierError {
    constructor(message, input = null, details = {}) {
        super(message, 'INVALID_INPUT', { input, ...details });
        this.input = input;
    }
}

/**
 * Error thrown when user cancels operation
 */
export class UserCancelledError extends ClaudeNotifierError {
    constructor(message = 'Operation cancelled by user', details = {}) {
        super(message, 'USER_CANCELLED', details);
    }
}

/**
 * Gracefully handle errors and exit
 * @param {Error} error - The error to handle
 * @param {boolean} restoreTerminal - Whether to restore terminal state
 */
export function handleError(error, restoreTerminal = true) {
    if (restoreTerminal) {
        // Exit alternate screen buffer
        console.log('\x1b[?1049l');
    }

    if (error instanceof UserCancelledError) {
        console.log(error.message);
        process.exit(0);
    }

    if (error instanceof ClaudeNotifierError) {
        console.error(`Error: ${error.message}`);

        // Show additional details for debugging if available
        if (error.details && Object.keys(error.details).length > 0) {
            console.error('Details:', JSON.stringify(error.details, null, 2));
        }

        process.exit(1);
    }

    // Unexpected error
    console.error('Unexpected error occurred:', error.message);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
}

/**
 * Gracefully exit the application
 * @param {number} code - Exit code
 * @param {string} message - Optional message to display
 */
export function safeExit(code = 0, message = null) {
    // Exit alternate screen buffer
    console.log('\x1b[?1049l');

    if (message) {
        if (code === 0) {
            console.log(message);
        } else {
            console.error(message);
        }
    }

    process.exit(code);
}