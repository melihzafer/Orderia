import { JsonValue } from '../../domain';

export type MutationErrorDisposition = 'retryable' | 'conflict' | 'rejected';

export interface MutationErrorDetails {
  readonly code?: string;
  readonly status?: number;
  readonly retryAfterMs?: number;
  readonly serverVersion?: number;
  readonly serverPayload?: JsonValue;
  readonly message: string;
}

export interface RetryPolicy {
  readonly baseDelayMs: number;
  readonly maximumDelayMs: number;
  readonly maximumAttempts: number;
}

export const defaultRetryPolicy: RetryPolicy = {
  baseDelayMs: 1_000,
  maximumDelayMs: 60_000,
  maximumAttempts: 8,
};

const retryableCodes = new Set([
  '40001',
  '40P01',
  '55P03',
  '57014',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
  'PGRST000',
  'PGRST001',
  'PGRST002',
  'PGRST003',
]);
const conflictCodes = new Set(['23505', '23P01']);
const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

export class MutationPushError extends Error {
  constructor(
    message: string,
    readonly details: Omit<MutationErrorDetails, 'message'> = {},
  ) {
    super(message);
    this.name = 'MutationPushError';
  }
}

export function mutationErrorDetails(error: unknown): MutationErrorDetails {
  if (error instanceof MutationPushError) {
    return { message: error.message, ...error.details };
  }

  if (error instanceof TypeError) {
    return { message: error.message, code: 'NETWORK_ERROR' };
  }

  if (error instanceof Error) {
    const candidate = error as Error & {
      readonly code?: unknown;
      readonly status?: unknown;
      readonly retryAfterMs?: unknown;
    };
    return {
      message: candidate.message,
      ...(typeof candidate.code === 'string' ? { code: candidate.code } : {}),
      ...(typeof candidate.status === 'number' ? { status: candidate.status } : {}),
      ...(typeof candidate.retryAfterMs === 'number'
        ? { retryAfterMs: candidate.retryAfterMs }
        : {}),
    };
  }

  return { message: 'Unknown mutation push failure' };
}

export function classifyMutationError(error: unknown): MutationErrorDisposition {
  const details = mutationErrorDetails(error);

  if (details.message === 'version_conflict' || details.code === 'VERSION_CONFLICT') {
    return 'conflict';
  }

  if (details.code && conflictCodes.has(details.code)) {
    return 'conflict';
  }

  if (
    details.code === 'NETWORK_ERROR' ||
    (details.code !== undefined && retryableCodes.has(details.code)) ||
    (details.status !== undefined && retryableStatuses.has(details.status))
  ) {
    return 'retryable';
  }

  return 'rejected';
}

export function retryDelayMs(
  attemptCount: number,
  policy: RetryPolicy = defaultRetryPolicy,
  random: () => number = Math.random,
  retryAfterMs?: number,
): number {
  if (!Number.isSafeInteger(attemptCount) || attemptCount <= 0) {
    throw new Error('Retry attempt count must be a positive safe integer');
  }

  if (retryAfterMs !== undefined) {
    return Math.min(policy.maximumDelayMs, Math.max(0, retryAfterMs));
  }

  const exponentialCap = Math.min(
    policy.maximumDelayMs,
    policy.baseDelayMs * 2 ** (attemptCount - 1),
  );
  const randomUnit = Math.min(1, Math.max(0, random()));
  return Math.floor(exponentialCap * randomUnit);
}
