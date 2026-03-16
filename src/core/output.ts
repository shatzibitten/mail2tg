import chalk from "chalk";
import type { OutputMode } from "../types/index.js";

interface JsonEnvelope {
  ok: boolean;
  message: string;
  data?: unknown;
  code?: number;
}

export class Output {
  constructor(private readonly mode: OutputMode = "human") {}

  info(message: string, data?: unknown): void {
    this.emit(true, message, data);
  }

  success(message: string, data?: unknown): void {
    if (this.mode === "human") {
      console.log(chalk.green(`✓ ${message}`));
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
      return;
    }
    this.emit(true, message, data);
  }

  warn(message: string, data?: unknown): void {
    if (this.mode === "human") {
      console.warn(chalk.yellow(`! ${message}`));
      if (data) {
        console.warn(chalk.gray(JSON.stringify(data, null, 2)));
      }
      return;
    }
    this.emit(true, message, data);
  }

  error(message: string, code = 1, data?: unknown): never {
    if (this.mode === "human") {
      console.error(chalk.red(`✗ ${message}`));
      if (data) {
        console.error(chalk.gray(JSON.stringify(data, null, 2)));
      }
    } else {
      const payload: JsonEnvelope = { ok: false, message, code, data };
      console.error(JSON.stringify(payload));
    }
    process.exit(code);
  }

  private emit(ok: boolean, message: string, data?: unknown): void {
    if (this.mode === "human") {
      console.log(message);
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
      return;
    }
    const payload: JsonEnvelope = { ok, message, data };
    console.log(JSON.stringify(payload));
  }
}
