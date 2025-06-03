import { injectable } from 'inversify';
import winston from 'winston';
import { Logger } from './logger';
import { config } from '@/config/environment';

@injectable()
export class WinstonLogger implements Logger {
  private logger: winston.Logger;

  constructor() {
    const transports: winston.transport[] = [];

    // Use different transports based on environment
    if (config.NODE_ENV === 'test') {
      // In test environment, use console transport with silent option
      transports.push(
        new winston.transports.Console({
          silent: true, // Suppress output during tests
          format: winston.format.combine(
            winston.format.simple()
          )
        })
      );
    } else {
      // In non-test environments, use file transports
      transports.push(
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
      );

      if (config.NODE_ENV !== 'production') {
        transports.push(
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          })
        );
      }
    }

    this.logger = winston.createLogger({
      level: config.LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'trading-bot' },
      transports,
    });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta = error instanceof Error 
      ? { ...meta, error: error.message, stack: error.stack }
      : { ...meta, error };
    this.logger.error(message, errorMeta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }
}
