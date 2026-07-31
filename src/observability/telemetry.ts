import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
import { anonymizeTelemetryId, redactTelemetryText, redactTelemetryValue } from './redaction';

export type OperationalEventName =
  | 'app_crash'
  | 'auth_failure'
  | 'auth_success'
  | 'local_database_failure'
  | 'migration_failure'
  | 'mutation_rejected'
  | 'outbox_stale'
  | 'payment_failure'
  | 'payment_latency'
  | 'realtime_reconnect'
  | 'receipt_render_failure'
  | 'sync_failure'
  | 'sync_latency'
  | 'sync_queue_depth';

export interface TelemetryDimensions {
  readonly operation?: string;
  readonly errorClass?: string;
  readonly mutationType?: string;
  readonly syncAttempt?: number;
  readonly [key: string]: boolean | number | string | undefined;
}

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const environment = process.env.EXPO_PUBLIC_APP_ENV?.trim() || 'development';
const release = process.env.EXPO_PUBLIC_APP_VERSION?.trim() || '2.0.0';

if (process.env.NODE_ENV !== 'test') {
  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment,
    release: `orderia@${release}`,
    dist: process.env.EXPO_PUBLIC_BUILD_NUMBER?.trim(),
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    tracesSampleRate: environment === 'production' ? 0.05 : 0,
    beforeBreadcrumb(breadcrumb) {
      return {
        ...breadcrumb,
        message: breadcrumb.message ? redactTelemetryText(breadcrumb.message) : undefined,
        data: redactTelemetryValue(breadcrumb.data) as Record<string, unknown> | undefined,
      };
    },
    beforeSend(event) {
      return {
        ...event,
        user: event.user?.id ? { id: event.user.id } : undefined,
        request: event.request
          ? {
              method: event.request.method,
              url: event.request.url?.split('?')[0],
            }
          : undefined,
        breadcrumbs: event.breadcrumbs?.map((breadcrumb) => ({
          ...breadcrumb,
          message: breadcrumb.message ? redactTelemetryText(breadcrumb.message) : undefined,
          data: redactTelemetryValue(breadcrumb.data) as Record<string, unknown> | undefined,
        })),
        extra: redactTelemetryValue(event.extra) as Record<string, unknown> | undefined,
      };
    },
  });

  Sentry.setTags({
    app_environment: environment,
    app_platform: Platform.OS,
    app_release: release,
  });
}

export function setTelemetryIdentity(input: {
  readonly organizationId?: string;
  readonly branchId?: string;
  readonly userId?: string;
  readonly deviceId?: string;
}): void {
  Sentry.setUser(input.userId ? { id: anonymizeTelemetryId(input.userId) } : null);
  Sentry.setTags({
    organization: input.organizationId ? anonymizeTelemetryId(input.organizationId) : 'none',
    branch: input.branchId ? anonymizeTelemetryId(input.branchId) : 'none',
    device: input.deviceId ? anonymizeTelemetryId(input.deviceId) : 'none',
  });
}

export function recordOperationalEvent(
  name: OperationalEventName,
  dimensions: TelemetryDimensions = {},
  value?: number,
): void {
  Sentry.addBreadcrumb({
    category: 'orderia.operation',
    level: name.endsWith('failure') || name === 'app_crash' ? 'error' : 'info',
    message: name,
    data: {
      ...dimensions,
      ...(value === undefined ? {} : { value }),
    },
  });
}

export function captureOperationalError(
  error: unknown,
  name: OperationalEventName,
  dimensions: TelemetryDimensions = {},
): string {
  recordOperationalEvent(name, dimensions);
  return Sentry.captureException(normalizeError(error), {
    tags: {
      operational_event: name,
      operation: dimensions.operation ?? 'unknown',
    },
    extra: redactTelemetryValue(dimensions) as Record<string, unknown>,
  });
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    const normalized = new Error(redactTelemetryText(error.message), { cause: error });
    normalized.name = error.name;
    normalized.stack = error.stack;
    return normalized;
  }
  return new Error(redactTelemetryText(String(error)));
}
