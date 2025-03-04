/**
 * Custom logging utility to standardize logging across the application
 * Provides namespaced logging with different log levels
 */

// Log levels
type LogLevel = 'log' | 'info' | 'warn' | 'err';

// Logger interface
interface Logger {
    log: (message: string, data?: Record<string, unknown>) => void;
    info: (message: string, data?: Record<string, unknown>) => void;
    warn: (message: string, data?: Record<string, unknown>) => void;
    err: (message: string, data?: Record<string, unknown>) => void;
}

/**
 * Creates a namespaced logger
 * @param namespace - The module or component name
 * @returns Logger interface with log, info, warn, and err methods
 */
export function createLogger(namespace: string): Logger {
    // Add timestamp and format data for console
    const formatLogData = (
        level: LogLevel,
        message: string,
        data?: Record<string, unknown>
    ): [string, Record<string, unknown>?] => {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${namespace}] ${message}`;

        return data ? [formattedMessage, data] : [formattedMessage];
    };

    return {
        // Standard log for trace level information
        log: (message: string, data?: Record<string, unknown>) => {
            console.log(...formatLogData('log', message, data));
        },

        // Info level for significant state changes
        info: (message: string, data?: Record<string, unknown>) => {
            console.info(...formatLogData('info', message, data));
        },

        // Warning level for non-fatal issues
        warn: (message: string, data?: Record<string, unknown>) => {
            console.warn(...formatLogData('warn', message, data));
        },

        // Error level for fatal issues
        err: (message: string, data?: Record<string, unknown>) => {
            console.error(...formatLogData('err', message, data));
        }
    };
} 