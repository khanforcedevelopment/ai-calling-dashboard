// All calling-time rules live here. UAE time is UTC+4 all year (no daylight saving).
const OFFSET_MS = 4 * 60 * 60 * 1000;

function hours() {
  return {
    start: Number(process.env.BUSINESS_HOURS_START || 9),
    end: Number(process.env.BUSINESS_HOURS_END || 18),
    enforced: process.env.BUSINESS_HOURS_ENFORCED !== 'false',
  };
}

function dubaiParts(d) {
  const x = new Date(d.getTime() + OFFSET_MS);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth(), day: x.getUTCDate(), h: x.getUTCHours(), min: x.getUTCMinutes() };
}

function dubaiDate(y, m, day, h, min = 0) {
  return new Date(Date.UTC(y, m, day, h, min) - OFFSET_MS);
}

// "2026-11-17T10:30" typed in the form (UAE time) -> Date
export function parseDubaiLocal(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(str || '');
  if (!m) return null;
  return dubaiDate(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

// Move a time into the allowed calling window (9am-6pm UAE by default).
export function clampToBusinessHours(d) {
  const { start, end, enforced } = hours();
  if (!enforced) return d;
  const p = dubaiParts(d);
  const minutes = p.h * 60 + p.min;
  if (minutes < start * 60) return dubaiDate(p.y, p.m, p.day, start);
  // Leave 10 minutes so a call does not start right before closing time
  if (minutes >= end * 60 - 10) return dubaiDate(p.y, p.m, p.day + 1, start);
  return d;
}

// Latest time a call is allowed to start, for the day of `d`.
export function latestStartFor(d) {
  const { end, enforced } = hours();
  const threeHours = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  if (!enforced) return threeHours;
  const p = dubaiParts(d);
  const close = dubaiDate(p.y, p.m, p.day, end);
  return threeHours < close ? threeHours : close;
}

// Give every contact a start time, spreading calls out so we stay within limits.
export function buildSlots(count, startAt) {
  const perMinute = Math.max(1, Number(process.env.CALLS_PER_MINUTE || 5));
  const slots = [];
  let cursor = clampToBusinessHours(startAt);
  for (let i = 0; i < count; i++) {
    if (i > 0 && i % perMinute === 0) {
      cursor = clampToBusinessHours(new Date(cursor.getTime() + 60 * 1000));
    }
    slots.push(new Date(cursor));
  }
  return slots;
}

export function isInsideBusinessHours(d = new Date()) {
  return clampToBusinessHours(d).getTime() === d.getTime();
}
