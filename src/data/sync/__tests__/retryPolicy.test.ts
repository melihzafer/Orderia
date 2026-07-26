import { MutationPushError, classifyMutationError, retryDelayMs } from '../retryPolicy';

describe('sync retry policy', () => {
  it.each([
    [new TypeError('Network request failed'), 'retryable'],
    [new MutationPushError('Unavailable', { status: 503 }), 'retryable'],
    [new MutationPushError('serialization', { code: '40001' }), 'retryable'],
    [new MutationPushError('version_conflict', { code: 'P0001' }), 'conflict'],
    [new MutationPushError('Forbidden', { status: 403 }), 'rejected'],
  ] as const)('classifies %s as %s', (error, expected) => {
    expect(classifyMutationError(error)).toBe(expected);
  });

  it('uses full jitter within the exponential cap', () => {
    expect(
      retryDelayMs(
        3,
        {
          baseDelayMs: 1_000,
          maximumDelayMs: 60_000,
          maximumAttempts: 8,
        },
        () => 0.5,
      ),
    ).toBe(2_000);
  });

  it('honors retry-after without exceeding the configured maximum', () => {
    expect(
      retryDelayMs(
        1,
        {
          baseDelayMs: 1_000,
          maximumDelayMs: 10_000,
          maximumAttempts: 8,
        },
        () => 0,
        30_000,
      ),
    ).toBe(10_000);
  });
});
