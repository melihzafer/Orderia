declare const businessDateBrand: unique symbol;
declare const businessDayCutoffBrand: unique symbol;

export type BusinessDate = string & {
  readonly [businessDateBrand]: 'BusinessDate';
};

export type BusinessDayCutoff = string & {
  readonly [businessDayCutoffBrand]: 'BusinessDayCutoff';
};

interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function toBusinessDayCutoff(value: string): BusinessDayCutoff {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) {
    throw new Error(`Invalid business-day cutoff: ${value}`);
  }

  return value as BusinessDayCutoff;
}

export function getBusinessDate(
  timestamp: Date | number | string,
  timeZone: string,
  cutoff: BusinessDayCutoff,
): BusinessDate {
  const instant = timestamp instanceof Date ? timestamp : new Date(timestamp);

  if (Number.isNaN(instant.getTime())) {
    throw new Error('Business date requires a valid timestamp');
  }

  const local = getLocalDateTimeParts(instant, timeZone);
  const [cutoffHour, cutoffMinute] = cutoff.split(':').map(Number);
  const beforeCutoff =
    local.hour < cutoffHour || (local.hour === cutoffHour && local.minute < cutoffMinute);

  if (!beforeCutoff) {
    return formatBusinessDate(local.year, local.month, local.day);
  }

  const previousDay = new Date(Date.UTC(local.year, local.month - 1, local.day) - 86_400_000);
  return formatBusinessDate(
    previousDay.getUTCFullYear(),
    previousDay.getUTCMonth() + 1,
    previousDay.getUTCDate(),
  );
}

function getLocalDateTimeParts(instant: Date, timeZone: string): LocalDateTimeParts {
  let parts: Intl.DateTimeFormatPart[];

  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(instant);
  } catch {
    throw new Error(`Invalid IANA time zone: ${timeZone}`);
  }

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  };
}

function formatBusinessDate(year: number, month: number, day: number): BusinessDate {
  return [
    year.toString().padStart(4, '0'),
    month.toString().padStart(2, '0'),
    day.toString().padStart(2, '0'),
  ].join('-') as BusinessDate;
}
