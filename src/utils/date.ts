/**
 * Date and timezone utilities for the wellness backend
 */

/**
 * Gets the start of day (00:00:00.000) for a given date
 */
export function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Gets the end of day (23:59:59.999) for a given date
 */
export function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

/**
 * Converts a UTC date to a local date string in the specified timezone
 */
export function toLocalDateString(date: Date, timezone: string): string {
    return date.toLocaleDateString('en-CA', { timeZone: timezone });
}

/**
 * Gets the local date (YYYY-MM-DD) for a given date and timezone
 */
export function getLocalDate(date: Date, timezone: string): Date {
    const localDateStr = toLocalDateString(date, timezone);
    return new Date(localDateStr + 'T00:00:00.000Z');
}

/**
 * Checks if two dates are the same calendar day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

/**
 * Checks if two dates are the same calendar day in a specific timezone
 */
export function isSameDayInTimezone(
    date1: Date,
    date2: Date,
    timezone: string
): boolean {
    const localDate1 = toLocalDateString(date1, timezone);
    const localDate2 = toLocalDateString(date2, timezone);
    return localDate1 === localDate2;
}

/**
 * Gets the date N days ago from a given date
 */
export function daysAgo(days: number, from: Date = new Date()): Date {
    const result = new Date(from);
    result.setDate(result.getDate() - days);
    return result;
}

/**
 * Gets the date N days from now
 */
export function daysFromNow(days: number, from: Date = new Date()): Date {
    const result = new Date(from);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Calculates the number of days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    const start = startOfDay(date1);
    const end = startOfDay(date2);
    return Math.round(Math.abs((end.getTime() - start.getTime()) / oneDay));
}

/**
 * Checks if a date is today
 */
export function isToday(date: Date): boolean {
    return isSameDay(date, new Date());
}

/**
 * Checks if a date is yesterday
 */
export function isYesterday(date: Date): boolean {
    return isSameDay(date, daysAgo(1));
}

/**
 * Checks if dates are consecutive calendar days (date2 is exactly 1 day after date1)
 */
export function areConsecutiveDays(date1: Date, date2: Date): boolean {
    return daysBetween(date1, date2) === 1 && date2 > date1;
}

/**
 * Gets the start of the current week (Sunday)
 */
export function startOfWeek(date: Date = new Date()): Date {
    const result = startOfDay(date);
    const day = result.getDay();
    result.setDate(result.getDate() - day);
    return result;
}

/**
 * Gets the start of the current month
 */
export function startOfMonth(date: Date = new Date()): Date {
    const result = new Date(date);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Validates if a string is a valid IANA timezone identifier
 */
export function isValidTimezone(timezone: string): boolean {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
    } catch {
        return false;
    }
}

/**
 * Gets the current date in a specific timezone as a Date object
 */
export function getCurrentDateInTimezone(timezone: string): Date {
    return getLocalDate(new Date(), timezone);
}
