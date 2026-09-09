import type { LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'fatal' | 'error' | 'warn' | 'debug' | 'verbose';

export class StructuredLogger implements LoggerService {
  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('log', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  private write(level: LogLevel, message: unknown, optionalParams: unknown[]): void {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message: message instanceof Error ? message.message : String(message),
      ...(optionalParams.length > 0 ? { context: optionalParams.map(String) } : {}),
    });
    if (level === 'error' || level === 'fatal') console.error(entry);
    else if (level === 'warn') console.warn(entry);
    else console.log(entry);
  }
}
