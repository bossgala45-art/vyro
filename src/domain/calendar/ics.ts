import type { IsoDate } from '../common/dates';
import { addDays, isLocalTime } from './time';
import type { LocalTime } from './types';

/**
 * Export iCalendar (RFC 5545) compatible avec le Calendrier de l'iPhone.
 *
 * Les heures sont saisies en heure locale « murale ». À l'export, elles sont converties
 * en UTC avec les règles de fuseau de l'appareil (changements d'heure compris), ce que
 * tous les calendriers interprètent sans ambiguïté. Un événement sans horaire est exporté
 * « sur la journée ».
 */

export interface IcsEvent {
  /** Identifiant stable : un même événement garde le même UID d'un export à l'autre. */
  uid: string;
  date: IsoDate;
  startTime: LocalTime | null;
  durationMinutes: number;
  summary: string;
  description: string;
  /** Rappel avant l'événement (minutes) ; `null` = aucun. */
  alarmMinutes: number | null;
  /**
   * Répété chaque jour. L'heure est alors exportée en heure locale « flottante » (sans fuseau) :
   * le rappel reste à la même heure murale après un changement d'heure.
   */
  repeatDaily?: boolean;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Instant UTC au format iCalendar (AAAAMMJJTHHMMSSZ) d'une date et heure locales. */
export function toUtcStamp(date: IsoDate, time: LocalTime, addMinutes = 0): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [h, min] = time.split(':').map(Number) as [number, number];
  const instant = new Date(y, m - 1, d, h, min + addMinutes);
  return formatUtc(instant);
}

/** Heure locale flottante (AAAAMMJJTHHMMSS, sans « Z ») d'une date et heure locales. */
export function toLocalStamp(date: IsoDate, time: LocalTime, addMinutes = 0): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [h, min] = time.split(':').map(Number) as [number, number];
  const instant = new Date(Date.UTC(y, m - 1, d, h, min + addMinutes));
  return formatUtc(instant).slice(0, -1);
}

export function formatUtc(instant: Date): string {
  return (
    `${instant.getUTCFullYear()}${pad(instant.getUTCMonth() + 1)}${pad(instant.getUTCDate())}` +
    `T${pad(instant.getUTCHours())}${pad(instant.getUTCMinutes())}${pad(instant.getUTCSeconds())}Z`
  );
}

/** Échappement des valeurs de texte (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Découpe les lignes à 75 octets UTF-8 maximum (RFC 5545 §3.1), sans couper un caractère. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // les lignes suivantes commencent par une espace
    if (size + bytes > limit) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function buildIcs(events: readonly IcsEvent[], now: Date): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VYRO//Coaching sportif//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const stamp = formatUtc(now);
  for (const event of events) {
    lines.push('BEGIN:VEVENT', `UID:${event.uid}`, `DTSTAMP:${stamp}`);
    if (event.repeatDaily && event.startTime !== null && isLocalTime(event.startTime)) {
      lines.push(`DTSTART:${toLocalStamp(event.date, event.startTime)}`);
      lines.push(`DTEND:${toLocalStamp(event.date, event.startTime, event.durationMinutes)}`);
      lines.push('RRULE:FREQ=DAILY');
    } else if (event.startTime !== null && isLocalTime(event.startTime)) {
      lines.push(`DTSTART:${toUtcStamp(event.date, event.startTime)}`);
      lines.push(`DTEND:${toUtcStamp(event.date, event.startTime, event.durationMinutes)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`);
      lines.push(`DTEND;VALUE=DATE:${addDays(event.date, 1).replace(/-/g, '')}`);
    }
    lines.push(`SUMMARY:${escapeText(event.summary)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.alarmMinutes !== null) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(event.summary)}`, `TRIGGER:-PT${event.alarmMinutes}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
