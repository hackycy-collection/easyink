const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(?:(Z)|([+-])(\d{2})(?::?(\d{2}))?)?$/i
const MS_PER_MINUTE = 60_000

export function parseDateInput(value: unknown): Date | undefined {
  if (value instanceof Date && Number.isFinite(value.getTime()))
    return value

  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date : undefined
  }

  if (typeof value !== 'string')
    return undefined

  const text = value.trim()
  if (!text)
    return undefined

  const dateOnly = DATE_ONLY_RE.exec(text)
  if (dateOnly) {
    return createLocalDate(
      Number(dateOnly[1]),
      Number(dateOnly[2]),
      Number(dateOnly[3]),
      0,
      0,
      0,
      0,
    )
  }

  const dateTime = DATE_TIME_RE.exec(text)
  if (!dateTime)
    return undefined

  const year = Number(dateTime[1])
  const month = Number(dateTime[2])
  const day = Number(dateTime[3])
  const hour = Number(dateTime[4])
  const minute = Number(dateTime[5])
  const second = Number(dateTime[6] ?? '0')
  const millisecond = normalizeMilliseconds(dateTime[7])

  if (dateTime[8]) {
    return createOffsetDate(year, month, day, hour, minute, second, millisecond, 0)
  }

  if (dateTime[9]) {
    const offsetHour = Number(dateTime[10])
    const offsetMinute = Number(dateTime[11] ?? '0')
    if (offsetHour > 23 || offsetMinute > 59)
      return undefined

    const offsetMinutes = (offsetHour * 60) + offsetMinute
    return createOffsetDate(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      dateTime[9] === '+' ? offsetMinutes : -offsetMinutes,
    )
  }

  return createLocalDate(year, month, day, hour, minute, second, millisecond)
}

function normalizeMilliseconds(raw: string | undefined): number {
  if (!raw)
    return 0
  return Number(raw.slice(0, 3).padEnd(3, '0'))
}

function createLocalDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): Date | undefined {
  const date = new Date(year, month - 1, day, hour, minute, second, millisecond)
  return matchesLocalDateParts(date, year, month, day, hour, minute, second, millisecond)
    ? date
    : undefined
}

function createOffsetDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  offsetMinutes: number,
): Date | undefined {
  const utcDate = createUtcDate(year, month, day, hour, minute, second, millisecond)
  if (!utcDate)
    return undefined
  return new Date(utcDate.getTime() - (offsetMinutes * MS_PER_MINUTE))
}

function createUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): Date | undefined {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond))
  return matchesUtcDateParts(date, year, month, day, hour, minute, second, millisecond)
    ? date
    : undefined
}

function matchesLocalDateParts(
  date: Date,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): boolean {
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && date.getHours() === hour
    && date.getMinutes() === minute
    && date.getSeconds() === second
    && date.getMilliseconds() === millisecond
}

function matchesUtcDateParts(
  date: Date,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): boolean {
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute
    && date.getUTCSeconds() === second
    && date.getUTCMilliseconds() === millisecond
}
