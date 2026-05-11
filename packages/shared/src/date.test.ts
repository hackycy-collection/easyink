import { describe, expect, it } from 'vitest'
import { parseDateInput } from './date'

describe('parseDateInput', () => {
  it('returns a valid Date instance unchanged', () => {
    const date = new Date('2026-05-03T02:04:05.000Z')
    expect(parseDateInput(date)).toBe(date)
  })

  it('parses timestamp numbers', () => {
    const date = parseDateInput(1_777_773_845_000)
    expect(date?.toISOString()).toBe('2026-05-03T02:04:05.000Z')
  })

  it('parses date-only strings as local calendar dates', () => {
    const date = parseDateInput('2026-05-03')
    expect(date).toBeInstanceOf(Date)
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(4)
    expect(date?.getDate()).toBe(3)
    expect(date?.getHours()).toBe(0)
    expect(date?.getMinutes()).toBe(0)
  })

  it('parses canonical local datetime strings deterministically', () => {
    const date = parseDateInput('2026-05-03 02:04:05.12')
    expect(date).toBeInstanceOf(Date)
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(4)
    expect(date?.getDate()).toBe(3)
    expect(date?.getHours()).toBe(2)
    expect(date?.getMinutes()).toBe(4)
    expect(date?.getSeconds()).toBe(5)
    expect(date?.getMilliseconds()).toBe(120)
  })

  it('parses ISO strings with explicit UTC timezone', () => {
    const date = parseDateInput('2026-05-03T02:04:05.123Z')
    expect(date?.toISOString()).toBe('2026-05-03T02:04:05.123Z')
  })

  it('parses ISO strings with explicit offsets', () => {
    const date = parseDateInput('2026-05-03T02:04:05+08:00')
    expect(date?.toISOString()).toBe('2026-05-02T18:04:05.000Z')
  })

  it('rejects locale-dependent strings', () => {
    expect(parseDateInput('05/03/2026')).toBeUndefined()
  })

  it('rejects impossible calendar dates', () => {
    expect(parseDateInput('2026-02-29')).toBeUndefined()
    expect(parseDateInput('2026-05-03T25:04:05')).toBeUndefined()
  })
})
