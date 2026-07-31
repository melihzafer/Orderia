import { anonymizeTelemetryId, redactTelemetryText, redactTelemetryValue } from '../redaction';

describe('telemetry redaction', () => {
  it('removes credentials, contact details, identifiers and signed query values', () => {
    expect(
      redactTelemetryText(
        'melih@example.com Bearer abc.def 123e4567-e89b-42d3-a456-426614174000 ?token=secret',
      ),
    ).toBe('[email] Bearer [redacted] [id] ?token=[redacted]');
  });

  it('redacts sensitive object keys recursively without mutating safe dimensions', () => {
    expect(
      redactTelemetryValue({
        operation: 'sync',
        nested: { note: 'customer said...', count: 3 },
        authorization: 'Bearer secret',
      }),
    ).toEqual({
      operation: 'sync',
      nested: { note: '[redacted]', count: 3 },
      authorization: '[redacted]',
    });
  });

  it('uses stable non-reversible identifiers for telemetry scope', () => {
    expect(anonymizeTelemetryId('same-user')).toBe(anonymizeTelemetryId('same-user'));
    expect(anonymizeTelemetryId('same-user')).not.toContain('same-user');
    expect(anonymizeTelemetryId('same-user')).toHaveLength(20);
  });
});
