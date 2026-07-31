const sensitiveKeyPattern =
  /authorization|cookie|password|secret|session|token|email|phone|customer|guest|note|description|input_text/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

export function redactTelemetryValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[truncated]';
  if (typeof value === 'string') return redactTelemetryText(value);
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((entry) => redactTelemetryValue(entry, depth + 1));
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 100)
      .map(([key, entry]) => [
        key,
        sensitiveKeyPattern.test(key) ? '[redacted]' : redactTelemetryValue(entry, depth + 1),
      ]),
  );
}

export function redactTelemetryText(value: string): string {
  return value
    .replace(emailPattern, '[email]')
    .replace(bearerPattern, 'Bearer [redacted]')
    .replace(uuidPattern, '[id]')
    .replace(/([?&](?:token|key|code|signature)=)[^&\s]+/gi, '$1[redacted]')
    .slice(0, 2_000);
}

export function anonymizeTelemetryId(value: string): string {
  return bytesToHex(sha256(value)).slice(0, 20);
}
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
