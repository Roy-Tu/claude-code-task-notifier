import { TerminalConfig } from '../types/index.js';

/**
 * Terminal management utilities for Claude Code Task Notifier
 */
export class Terminal {
  private static _alternateScreenActive = false;

  /**
   * Enter alternate screen buffer and clear screen
   */
  static enterAlternateScreen(): void {
    console.log('\x1b[?1049h\x1b[2J\x1b[H');
    this._alternateScreenActive = true;
  }

  /**
   * Exit alternate screen buffer
   */
  static exitAlternateScreen(): void {
    console.log('\x1b[?1049l');
    this._alternateScreenActive = false;
  }

  /**
   * Clear the current screen
   */
  static clearScreen(): void {
    console.log('\x1b[2J\x1b[H');
  }

  /**
   * Set up terminal for the application
   * - Enters alternate screen buffer
   * - Sets up exit handlers to restore terminal
   */
  static setup(): void {
    this.enterAlternateScreen();

    // Ensure exit sequence is always called to restore the terminal
    this._setupExitHandlers();
  }

  /**
   * Setup handlers to restore terminal on exit
   * @private
   */
  private static _setupExitHandlers(): void {
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
    process.on('uncaughtException', (error: Error) => {
      if (this._alternateScreenActive) {
        this.exitAlternateScreen();
      }
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Catch unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
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
  static restore(): void {
    if (this._alternateScreenActive) {
      this.exitAlternateScreen();
    }
  }

  /**
   * Check if alternate screen is currently active
   * @returns True if alternate screen is active
   */
  static isAlternateScreenActive(): boolean {
    return this._alternateScreenActive;
  }

  /**
   * Print a header with separators
   * @param title - The title to display
   * @param separator - Character to use for separation (default: '─')
   * @param width - Width of the header (default: 25)
   */
  static printHeader(title: string, separator = '─', width = 25): void {
    const separatorLine = separator.repeat(width);
    console.log(separatorLine);
    console.log(title);
    console.log(separatorLine);
  }

  /**
   * Print a header with custom configuration
   * @param title - The title to display
   * @param config - Terminal configuration options
   */
  static printHeaderWithConfig(title: string, config: TerminalConfig): void {
    this.printHeader(title, config.separator, config.width);
  }

  /**
   * Print a success message
   * @param message - The success message
   */
  static printSuccess(message: string): void {
    console.log(`✅ ${message}`);
  }

  /**
   * Print an error message
   * @param message - The error message
   */
  static printError(message: string): void {
    console.error(`❌ ${message}`);
  }

  /**
   * Print a warning message
   * @param message - The warning message
   */
  static printWarning(message: string): void {
    console.warn(`⚠️  ${message}`);
  }

  /**
   * Print an info message
   * @param message - The info message
   */
  static printInfo(message: string): void {
    console.log(`ℹ️  ${message}`);
  }
}