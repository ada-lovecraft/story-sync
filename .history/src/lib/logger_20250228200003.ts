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
    ): [string, Record<string, unknown> | undefined] => {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${namespace}] ${message}`;

        return [formattedMessage, data];
    };

    return {
        // Standard log for trace level information
        log: (message: string, data?: Record<string, unknown>) => {
            const [formattedMessage, logData] = formatLogData('log', message, data);
            if (logData) {
                console.log(formattedMessage, logData);
            } else {
                console.log(formattedMessage);
            }
        },

        // Info level for significant state changes
        info: (message: string, data?: Record<string, unknown>) => {
            const [formattedMessage, logData] = formatLogData('info', message, data);
            if (logData) {
                console.info(formattedMessage, logData);
            } else {
                console.info(formattedMessage);
            }
        },

        // Warning level for non-fatal issues
        warn: (message: string, data?: Record<string, unknown>) => {
            const [formattedMessage, logData] = formatLogData('warn', message, data);
            if (logData) {
                console.warn(formattedMessage, logData);
            } else {
                console.warn(formattedMessage);
            }
        },

        // Error level for fatal issues
        err: (message: string, data?: Record<string, unknown>) => {
            const [formattedMessage, logData] = formatLogData('err', message, data);
            if (logData) {
                console.error(formattedMessage, logData);
            } else {
                console.error(formattedMessage);
            }
        }
    };
} 