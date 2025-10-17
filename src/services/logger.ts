/**
 * Structured Logging Service
 *
 * Provides centralized logging with different levels, context, and
 * integration with monitoring services
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface LogContext {
  userId?: string;
  companyId?: string;
  requestId?: string;
  sessionId?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
  metadata?: Record<string, any>;
}

class Logger {
  private context: LogContext = {};
  private isDevelopment: boolean;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.initializeSessionId();
  }

  /**
   * Initialize a unique session ID for tracking user sessions
   */
  private initializeSessionId() {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('sierra-session-id');
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        sessionStorage.setItem('sierra-session-id', sessionId);
      }
      this.setContext({ sessionId });
    }
  }

  /**
   * Set global context that will be included in all logs
   */
  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear specific context keys
   */
  clearContext(keys?: string[]) {
    if (keys) {
      keys.forEach((key) => delete this.context[key]);
    } else {
      this.context = {};
      this.initializeSessionId();
    }
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error,
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      metadata,
      error,
    };
  }

  /**
   * Write log entry to console and buffer
   */
  private writeLog(entry: LogEntry) {
    // Add to buffer for later analysis
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Console output in development
    if (this.isDevelopment) {
      const { level, message, context, metadata, error } = entry;
      const logData = {
        message,
        ...(Object.keys(context || {}).length > 0 && { context }),
        ...(metadata && { metadata }),
      };

      switch (level) {
        case LogLevel.DEBUG:
          console.debug('[DEBUG]', logData, error);
          break;
        case LogLevel.INFO:
          console.info('[INFO]', logData);
          break;
        case LogLevel.WARN:
          console.warn('[WARN]', logData, error);
          break;
        case LogLevel.ERROR:
          console.error('[ERROR]', logData, error);
          break;
        case LogLevel.CRITICAL:
          console.error('[CRITICAL]', logData, error);
          break;
      }
    }

    // Send to external monitoring service in production
    if (!this.isDevelopment && entry.level !== LogLevel.DEBUG) {
      this.sendToMonitoring(entry);
    }
  }

  /**
   * Send log to external monitoring service (Sentry, etc.)
   */
  private sendToMonitoring(entry: LogEntry) {
    // TODO: Integrate with Sentry or other monitoring service
    // Example: Sentry.captureMessage(entry.message, { level: entry.level, ...entry });

    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.CRITICAL) {
      // Send errors to error tracking
      if (entry.error && typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(entry.error, {
          level: entry.level,
          tags: entry.context,
          extra: entry.metadata,
        });
      }
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, metadata?: Record<string, any>) {
    this.writeLog(this.createLogEntry(LogLevel.DEBUG, message, metadata));
  }

  /**
   * Info level logging
   */
  info(message: string, metadata?: Record<string, any>) {
    this.writeLog(this.createLogEntry(LogLevel.INFO, message, metadata));
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata?: Record<string, any>, error?: Error) {
    this.writeLog(this.createLogEntry(LogLevel.WARN, message, metadata, error));
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, metadata?: Record<string, any>) {
    this.writeLog(this.createLogEntry(LogLevel.ERROR, message, metadata, error));
  }

  /**
   * Critical level logging
   */
  critical(message: string, error?: Error, metadata?: Record<string, any>) {
    this.writeLog(this.createLogEntry(LogLevel.CRITICAL, message, metadata, error));
  }

  /**
   * Get recent logs from buffer
   */
  getRecentLogs(count = 50): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Clear log buffer
   */
  clearBuffer() {
    this.logBuffer = [];
  }

  /**
   * Performance logging helper
   */
  performance(operation: string, startTime: number, metadata?: Record<string, any>) {
    const duration = Date.now() - startTime;
    this.info(`Performance: ${operation}`, {
      duration,
      ...metadata,
    });

    // Warn if operation took too long
    if (duration > 3000) {
      this.warn(`Slow operation detected: ${operation}`, { duration, ...metadata });
    }
  }

  /**
   * Track user action
   */
  trackAction(action: string, metadata?: Record<string, any>) {
    this.info(`User Action: ${action}`, metadata);

    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', action, metadata);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience function for measuring performance
export const measurePerformance = <T>(
  operation: string,
  fn: () => T | Promise<T>,
  metadata?: Record<string, any>,
): T | Promise<T> => {
  const startTime = Date.now();
  const result = fn();

  if (result instanceof Promise) {
    return result.finally(() => {
      logger.performance(operation, startTime, metadata);
    }) as Promise<T>;
  } else {
    logger.performance(operation, startTime, metadata);
    return result;
  }
};
