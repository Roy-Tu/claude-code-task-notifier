import { ErrorCode, ErrorDetails, SettingsOperation } from '../types/index.js';

/**
 * Base error class for Claude Notifier errors
 */
export class ClaudeNotifierError extends Error {
  public readonly code: ErrorCode;
  public readonly details: ErrorDetails;

  constructor(message: string, code: ErrorCode = ErrorCode.UNKNOWN_ERROR, details: ErrorDetails = {}) {
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
   * @returns JSON representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Error thrown when platform is not supported
 */
export class UnsupportedPlatformError extends ClaudeNotifierError {
  constructor(platform: string | null = null, details: ErrorDetails = {}) {
    const message = platform
      ? `Platform '${platform}' is not supported`
      : 'No supported notification platform found for this operating system';

    super(message, ErrorCode.UNSUPPORTED_PLATFORM, { platform, ...details });
  }
}

/**
 * Error thrown when settings file operations fail
 */
export class SettingsError extends ClaudeNotifierError {
  public readonly operation: SettingsOperation | null;
  public readonly path: string | null;

  constructor(
    message: string,
    operation: SettingsOperation | null = null,
    path: string | null = null,
    details: ErrorDetails = {}
  ) {
    super(message, ErrorCode.SETTINGS_ERROR, { operation, path, ...details });
    this.operation = operation;
    this.path = path;
  }
}

/**
 * Error thrown when command validation fails
 */
export class CommandValidationError extends ClaudeNotifierError {
  public readonly command: string;
  public readonly reason: string | null;

  constructor(command: string, reason: string | null = null, details: ErrorDetails = {}) {
    const message = reason
      ? `Command validation failed: ${reason}`
      : 'Generated command failed validation';

    super(message, ErrorCode.COMMAND_VALIDATION_ERROR, { command, reason, ...details });
    this.command = command;
    this.reason = reason;
  }
}

/**
 * Error thrown when user input is invalid
 */
export class InvalidInputError extends ClaudeNotifierError {
  public readonly input: unknown;

  constructor(message: string, input: unknown = null, details: ErrorDetails = {}) {
    super(message, ErrorCode.INVALID_INPUT, { input, ...details });
    this.input = input;
  }
}

/**
 * Error thrown when user cancels operation
 */
export class UserCancelledError extends ClaudeNotifierError {
  constructor(message = 'Operation cancelled by user', details: ErrorDetails = {}) {
    super(message, ErrorCode.USER_CANCELLED, details);
  }
}

/**
 * Gracefully handle errors and exit
 * @param error - The error to handle
 * @param restoreTerminal - Whether to restore terminal state
 */
export function handleError(error: Error, restoreTerminal = true): never {
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
 * @param code - Exit code
 * @param message - Optional message to display
 */
export function safeExit(code = 0, message: string | null = null): never {
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