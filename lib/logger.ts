type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

class Logger {
  private format(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  private print(entry: LogEntry) {
    const output = JSON.stringify(entry);
    if (entry.level === 'error') {
      console.error(output);
    } else if (entry.level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.print(this.format('info', message, context));
  }

  warn(message: string, context?: Record<string, any>) {
    this.print(this.format('warn', message, context));
  }

  error(message: string, context?: Record<string, any>) {
    this.print(this.format('error', message, context));
  }

  debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV !== 'production') {
      this.print(this.format('debug', message, context));
    }
  }
}

export const logger = new Logger();
