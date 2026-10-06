import { expandRecurringEvent, parseICS, type ParameterValue, type VEvent } from "node-ical";

export type ParsedEvent = {
  /** Stable identity: the iCal UID, or "<uid>#<original start>" for recurring instances. */
  key: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  cancelled: boolean;
};

export type ParseResult = {
  events: ParsedEvent[];
  skippedFullDay: number;
};

function text(value: ParameterValue | undefined): string | null {
  const raw = typeof value === "string" ? value : value?.val;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

/** Parses an iCal feed into plain events inside [from, to]; recurring events are expanded. */
export function parseFeed(body: string, range: { from: Date; to: Date }): ParseResult {
  const calendar = parseICS(body);
  const byKey = new Map<string, ParsedEvent>();
  let skippedFullDay = 0;

  for (const component of Object.values(calendar)) {
    if (!component || component.type !== "VEVENT") continue;
    const event = component as VEvent;
    const title = text(event.summary);
    if (!title || !event.start) continue;

    const common = {
      title,
      location: text(event.location),
      cancelled: event.status === "CANCELLED",
    };

    if (event.rrule) {
      for (const instance of expandRecurringEvent(event, { from: range.from, to: range.to })) {
        if (instance.isFullDay) {
          skippedFullDay++;
          continue;
        }
        // overrides keep the key of the slot they replace, so moving one instance updates it in place
        const slot = instance.isOverride && instance.event.recurrenceid ? instance.event.recurrenceid : instance.start;
        const key = `${event.uid}#${slot.toISOString()}`;
        byKey.set(key, {
          ...common,
          key,
          title: text(instance.event.summary) ?? title,
          startsAt: instance.start,
          endsAt: instance.end ?? null,
          location: text(instance.event.location) ?? common.location,
          cancelled: common.cancelled || instance.event.status === "CANCELLED",
        });
      }
      continue;
    }

    if (event.datetype === "date") {
      skippedFullDay++;
      continue;
    }
    if (event.start < range.from || event.start > range.to) continue;
    byKey.set(event.uid, { ...common, key: event.uid, startsAt: event.start, endsAt: event.end ?? null });
  }

  return {
    events: [...byKey.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    skippedFullDay,
  };
}
