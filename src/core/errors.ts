export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "CliError";
  }
}

export function getExitCode(error: unknown, fallback = 3): number {
  if (error instanceof CliError) {
    return error.exitCode;
  }
  return fallback;
}
