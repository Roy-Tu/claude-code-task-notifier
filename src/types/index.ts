/**
 * Enums and type definitions for Claude Code Task Notifier
 */

/**
 * Supported platform identifiers
 */
export enum Platform {
  MACOS = 'macos',
  WINDOWS = 'windows',
}

/**
 * Hook action types
 */
export enum HookAction {
  COMPLETED = 'Completed',
  STOPPED = 'Stopped',
}

/**
 * Hook type in Claude settings
 */
export enum HookType {
  COMMAND = 'command',
}

/**
 * Error codes for structured error handling
 */
export enum ErrorCode {
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  UNSUPPORTED_PLATFORM = 'UNSUPPORTED_PLATFORM',
  SETTINGS_ERROR = 'SETTINGS_ERROR',
  COMMAND_VALIDATION_ERROR = 'COMMAND_VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  USER_CANCELLED = 'USER_CANCELLED',
}

/**
 * Settings file operations
 */
export enum SettingsOperation {
  READ = 'read',
  WRITE = 'write',
  PARSE = 'parse',
  VALIDATE = 'validate',
  MERGE_HOOKS = 'mergeHooks',
  GET_DATA = 'getData',
  GET_HOOKS = 'getHooks',
}

/**
 * Hook selection values from prompts
 */
export enum HookSelection {
  ON_NOTIFICATION = 'onNotification',
  ON_NOTIFICATION_SOUND = 'onNotificationSound',
  ON_STOP = 'onStop',
  ON_STOP_SOUND = 'onStopSound',
}

/**
 * Confirmation actions
 */
export enum ConfirmationAction {
  INSTALL = 'install',
  EXIT = 'exit',
}

/**
 * Structure of a Claude hook configuration
 */
export interface ClaudeHook {
  type: HookType;
  command: string;
}

/**
 * Structure of a hook group in Claude settings
 */
export interface ClaudeHookGroup {
  hooks: ClaudeHook[];
}

/**
 * Structure of hooks section in Claude settings
 */
export interface ClaudeHooks {
  Notification?: ClaudeHookGroup[];
  Stop?: ClaudeHookGroup[];
  [key: string]: ClaudeHookGroup[] | undefined;
}

/**
 * Structure of Claude settings file
 */
export interface ClaudeSettingsData {
  hooks?: ClaudeHooks;
  [key: string]: unknown;
}

/**
 * Hook configuration preferences parsed from user selection
 */
export interface HookConfiguration {
  notificationEnabled: boolean;
  notificationWithSound: boolean;
  stopEnabled: boolean;
  stopWithSound: boolean;
}

/**
 * Validation result for hook selection
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Error details object
 */
export interface ErrorDetails {
  [key: string]: unknown;
}

/**
 * Choice object for inquirer prompts
 */
export interface PromptChoice {
  name: string;
  value: string;
  checked?: boolean;
}

/**
 * Platform detection result
 */
export interface PlatformInfo {
  id: Platform;
  isSupported: boolean;
}

/**
 * Terminal styling configuration
 */
export interface TerminalConfig {
  separator: string;
  width: number;
}