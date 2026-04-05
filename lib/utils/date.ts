const TZ = "America/Chicago";

/** Format a date/ISO string for display in Chicago time */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString("en-US", { timeZone: TZ, ...options });
}

/** Format a time in Chicago time */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Format date + time together */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Convert a Date to a "YYYY-MM-DDTHH:mm" string in Chicago time (for datetime-local inputs) */
export function toChicagoInputValue(date: Date): string {
  const str = date.toLocaleString("sv-SE", { timeZone: TZ }); // "YYYY-MM-DD HH:mm:ss"
  return str.slice(0, 16).replace(" ", "T");
}

/** Get today's date as "YYYY-MM-DD" in Chicago time */
export function todayChicago(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
}
