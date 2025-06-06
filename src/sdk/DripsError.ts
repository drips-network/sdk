export type DripsErrorMeta = {
  [key: string]: unknown;
};

export class DripsError extends Error {
  readonly cause?: unknown;
  readonly meta?: DripsErrorMeta;

  constructor(
    message: string,
    options?: {cause?: unknown; meta?: DripsErrorMeta},
  ) {
    super(`[Drips SDK] ${message}`, {cause: options?.cause});
    this.name = 'DripsError';
    this.cause = options?.cause;
    this.meta = options?.meta;
  }
}
