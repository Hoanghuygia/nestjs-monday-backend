import { Logger as MondayLogger } from '@mondaycom/apps-sdk';

interface Options {
  function: Function;
}

export class Logger {
  private readonly mondayLogger: MondayLogger;
  private readonly tag: string;

  constructor(tag: string) {
    this.mondayLogger = new MondayLogger(tag);
    this.tag = tag;
  }

  private fmt(message: string, options?: Options): string {
    if (options?.function) {
      return `[${this.tag}]-[${options.function.name}] ${message}`;
    }
    return `[${this.tag}] ${message}`;
  }

  debug(message: string, options?: Options): void {
    this.mondayLogger.debug(this.fmt(message, options));
  }
  error(message: string, options?: Options): void {
    this.mondayLogger.error(this.fmt(message, options));
  }
  warn(message: string, options?: Options): void {
    this.mondayLogger.warn(this.fmt(message, options));
  }
  info(message: string, options?: Options): void {
    this.mondayLogger.info(this.fmt(message, options));
  }
}
