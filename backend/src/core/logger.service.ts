import { Injectable, LoggerService as NestLoggerService } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private readonly pinoLogger: PinoLogger) {}

  log(message: any, context?: string) {
    this.pinoLogger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.pinoLogger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.pinoLogger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.pinoLogger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.pinoLogger.trace(message, { context });
  }
}

