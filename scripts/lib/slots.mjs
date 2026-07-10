/**
 * Horários de publicação AniVerse: 09:00, 15:00, 19:00 (America/Sao_Paulo)
 */

export const TIMEZONE = 'America/Sao_Paulo';
export const SLOT_HOURS = [9, 15, 19];

/** Partes de data/hora no fuso de São Paulo */
export function zonedParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  const parts = Object.fromEntries(
    fmt
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

/** Y-M-D H:M em São Paulo → Date (UTC). BRT = UTC-3 o ano todo. */
export function spToUtcDate(year, month, day, hour, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0));
}

export function formatPublishAt(year, month, day, hour) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:00:00-03:00`;
}

export function normalizeSlotKey(iso) {
  const m = String(iso).match(/(\d{4}-\d{2}-\d{2})T(\d{2})/);
  if (!m) return String(iso);
  return `${m[1]}T${m[2]}`;
}

/**
 * Próximo slot livre (9h, 15h ou 19h BRT) estritamente depois de `after`.
 * `occupied` = array de ISO publishAt já usados.
 */
export function nextFreeSlot(after = new Date(), occupied = []) {
  const occupiedSet = new Set(
    occupied
      .map((iso) => {
        try {
          return normalizeSlotKey(iso);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
  );

  const start = zonedParts(after);
  // cursor de calendário em SP
  let y = start.year;
  let m = start.month;
  let d = start.day;

  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    if (dayOffset > 0) {
      // avança um dia civil
      const noon = spToUtcDate(y, m, d, 12, 0);
      const next = new Date(noon.getTime() + 24 * 60 * 60 * 1000);
      const p = zonedParts(next);
      y = p.year;
      m = p.month;
      d = p.day;
    }

    for (const hour of SLOT_HOURS) {
      const slotDate = spToUtcDate(y, m, d, hour, 0);
      if (slotDate.getTime() <= after.getTime()) continue;
      const iso = formatPublishAt(y, m, d, hour);
      if (occupiedSet.has(normalizeSlotKey(iso))) continue;
      return {
        publishAt: iso,
        date: formatPublishAt(y, m, d, hour).slice(0, 10),
        hour,
        label: `${iso} (${TIMEZONE})`
      };
    }
  }

  throw new Error('Não foi possível encontrar slot livre nos próximos 60 dias');
}

export function isDue(publishAt, now = new Date()) {
  if (!publishAt) return false;
  const t = Date.parse(publishAt);
  if (Number.isNaN(t)) return false;
  return t <= now.getTime();
}
