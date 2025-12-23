import { Logger as MondayLogger } from '@mondaycom/apps-sdk';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';

interface Options {
  function: Function;
}

@Injectable({ scope: Scope.TRANSIENT })
export class Logger {
  private readonly mondayLogger: MondayLogger;
  private readonly tag: string;

  constructor(@Inject(INQUIRER) private parentClass: object | string) {
    if (typeof this.parentClass === 'string') {
      this.tag = this.parentClass;
    } else {
      this.tag = this.parentClass?.constructor?.name || 'Common';
    }
    this.mondayLogger = new MondayLogger(this.tag);
  }

  private fmt(message: string, options?: Options): string {
    if (options?.function) {
      return `[${this.tag}]-[${options.function.name}] ${message}`;
    }
    return `[${this.tag}] ${message}`;
  }

  debug(message: string, options?: Options): void {
    this.mondayLogger.debug(`\x1b[35m${this.fmt(message, options)}\x1b[0m`);
  }
  error(message: string, options?: Options): void {
    this.mondayLogger.error(`\x1b[31m${this.fmt(message, options)}\x1b[0m`);
  }
  warn(message: string, options?: Options): void {
    this.mondayLogger.warn(`\x1b[33m${this.fmt(message, options)}\x1b[0m`);
  }
  info(message: string, options?: Options): void {
    this.mondayLogger.info(`\x1b[32m${this.fmt(message, options)}\x1b[0m`);
  }
}
