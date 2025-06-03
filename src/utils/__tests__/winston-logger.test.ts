import { WinstonLogger } from '../winston-logger';

describe('WinstonLogger', () => {
  let logger: WinstonLogger;

  beforeEach(() => {
    logger = new WinstonLogger();
  });

  describe('logging methods', () => {
    it('should create logger instance without throwing', () => {
      expect(logger).toBeInstanceOf(WinstonLogger);
    });

    it('should log info messages without throwing', () => {
      expect(() => {
        logger.info('Test info message');
      }).not.toThrow();
    });

    it('should log info messages with metadata', () => {
      expect(() => {
        logger.info('Test info message', { key: 'value' });
      }).not.toThrow();
    });

    it('should log error messages with Error objects', () => {
      const error = new Error('Test error');
      expect(() => {
        logger.error('Test error message', error);
      }).not.toThrow();
    });

    it('should log error messages with metadata', () => {
      expect(() => {
        logger.error('Test error message', new Error('test'), { context: 'test' });
      }).not.toThrow();
    });

    it('should log warning messages', () => {
      expect(() => {
        logger.warn('Test warning message');
      }).not.toThrow();
    });

    it('should log warning messages with metadata', () => {
      expect(() => {
        logger.warn('Test warning message', { level: 'high' });
      }).not.toThrow();
    });

    it('should log debug messages', () => {
      expect(() => {
        logger.debug('Test debug message');
      }).not.toThrow();
    });

    it('should log debug messages with metadata', () => {
      expect(() => {
        logger.debug('Test debug message', { module: 'test' });
      }).not.toThrow();
    });
  });
});
