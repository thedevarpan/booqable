import React, { useEffect, useMemo, useState } from 'react';
import { safeFetch } from '@/lib/safeFetch';

const DEFAULT_ICS_URL = 'https://dance-costumes-for-hire-90e5.booqable.com/integrations/calendar/e313abf2b30213a486a238d0986a64df/orders.ics';

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function toYMD(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }

function parseICSToDate(icsDate: string): { date: Date; isDateOnly: boolean } {
  // Formats: YYYYMMDD or YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const dateOnlyMatch = /^([0-9]{4})([0-9]{2})([0-9]{2})$/.exec(icsDate);
  if (dateOnlyMatch) {
    const y = parseInt(dateOnlyMatch[1], 10);
    const m = parseInt(dateOnlyMatch[2], 10) - 1;
    const d = parseInt(dateOnlyMatch[3], 10);
    return { date: new Date(Date.UTC(y, m, d)), isDateOnly: true };
  }

  const dateTimeMatch = /^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})(Z?)$/.exec(icsDate);
  if (dateTimeMatch) {
    const y = parseInt(dateTimeMatch[1], 10);
    const m = parseInt(dateTimeMatch[2], 10) - 1;
    const d = parseInt(dateTimeMatch[3], 10);
    const hh = parseInt(dateTimeMatch[4], 10);
    const mm = parseInt(dateTimeMatch[5], 10);
    const ss = parseInt(dateTimeMatch[6], 10);
    if (dateTimeMatch[7] === 'Z') {
      return { date: new Date(Date.UTC(y, m, d, hh, mm, ss)), isDateOnly: false };
    }
    // Treat timezone-less times as local but convert to UTC by using Date constructor
    return { date: new Date(y, m, d, hh, mm, ss), isDateOnly: false };
  }

  // Fallback to Date parsing
  const parsed = new Date(icsDate);
  return { date: parsed, isDateOnly: false };
}

function extractEventsFromICS(icsText: string) {
  const events: Array<{ start: Date; end: Date; startIsDateOnly: boolean; endIsDateOnly: boolean }> = [];
  const blocks = icsText.split(/BEGIN:VEVENT/gi);
  for (const block of blocks) {
    if (!/DTSTART/i.test(block)) continue;
    const dtstartMatch = block.match(/DTSTART(?:;[^:]*)?:([^\r\n]+)/i);
    const dtendMatch = block.match(/DTEND(?:;[^:]*)?:([^\r\n]+)/i);
    if (!dtstartMatch) continue;
    const dtstartRaw = dtstartMatch[1].trim();
    const dtendRaw = dtendMatch ? dtendMatch[1].trim() : null;
    const pStart = parseICSToDate(dtstartRaw);
    let pEnd = dtendRaw ? parseICSToDate(dtendRaw) : null;

    if (!pEnd) {
      // If no DTEND, treat as single-day event
      pEnd = { date: new Date(pStart.date.getTime()), endIsDateOnly: pStart.isDateOnly } as any;
    }

    // Many ICS providers use DTEND as exclusive when date-only (i.e., DTEND is day after last occupied day)
    // If end is date-only and time is 00:00:00 (as constructed above in UTC), treat as exclusive and subtract one day
    let endDate = pEnd.date;
    if (pEnd.isDateOnly) {
      // endDate is at UTC midnight for that day -> exclusive -> subtract 1 day to make inclusive
      endDate = new Date(endDate.getTime());
      endDate.setUTCDate(endDate.getUTCDate() - 1);
    }

    // For date-time with zero time, be conservative and include the end day
    events.push({ start: pStart.date, end: endDate, startIsDateOnly: pStart.isDateOnly, endIsDateOnly: pEnd.isDateOnly });
  }
  return events;
}

function expandEventsToDates(events: ReturnType<typeof extractEventsFromICS>) {
  const set = new Set<string>();
  for (const ev of events) {
    // normalize start and end to local midnight for iteration
    const startLocal = new Date(ev.start);
    const endLocal = new Date(ev.end);
    // iterate from startLocal to endLocal inclusive
    const cur = new Date(startLocal.getFullYear(), startLocal.getMonth(), startLocal.getDate());
    const last = new Date(endLocal.getFullYear(), endLocal.getMonth(), endLocal.getDate());
    while (cur <= last) {
      set.add(toYMD(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return set;
}

export default function IcsCalendarViewer({
  icsUrl = DEFAULT_ICS_URL,
  initialMonth,
  productId,
}: { icsUrl?: string; initialMonth?: Date; productId?: string }) {
  const [icsText, setIcsText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth || new Date());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      const tryFetch = async (url: string | undefined, label: string) => {
        if (!url) return { ok: false, status: 0, text: '', url } as any;
        try {
          const resp = await safeFetch(url, { method: 'GET', cache: 'no-store', timeoutMs: 12000 } as any);
          const bodyText = await resp.text().catch(() => '');
          return { ok: resp.ok, status: resp.status, text: bodyText, url } as any;
        } catch (e: any) {
          return { ok: false, status: 0, text: e && e.message ? e.message : String(e), url } as any;
        }
      };

      try {
        // Try server proxy using productId first (most targeted)
        let result: any = { ok: false };

        if (productId) {
          result = await tryFetch(`/api/availability/ics?productId=${encodeURIComponent(productId)}`, 'product-proxy');
        }

        // If that failed, and we have an absolute icsUrl, try proxying that explicit URL
        if (!result.ok && icsUrl && /^https?:\/\//i.test(icsUrl)) {
          result = await tryFetch(`/api/availability/ics?url=${encodeURIComponent(icsUrl)}`, 'url-proxy');
        }

        // If still failed, try company-level proxy without params (server will use env/default)
        if (!result.ok) {
          result = await tryFetch(`/api/availability/ics`, 'company-proxy');
        }

        if (!result.ok) {
          const msg = `Failed to fetch ICS: ${result.status || 'network'}${result.text ? ' — ' + result.text : ''}`;
          throw new Error(msg);
        }

        if (!cancelled) setIcsText(result.text);
      } catch (err: any) {
        console.error('Failed to load ICS', err);
        if (!cancelled) setError(err && err.message ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [icsUrl]);

  const events = useMemo(() => (icsText ? extractEventsFromICS(icsText) : []), [icsText]);
  const bookedSet = useMemo(() => expandEventsToDates(events), [events]);

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  // compute grid start (Sunday of the week that contains the 1st)
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  const days: Date[] = [];
  const temp = new Date(gridStart);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(temp));
    temp.setDate(temp.getDate() + 1);
  }

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <button onClick={prevMonth} className="px-2 py-1 rounded border bg-gray-50">Prev</button>
          <div className="font-semibold">{currentMonth.toLocaleDateString('en-US',{ month: 'long', year: 'numeric' })}</div>
          <button onClick={nextMonth} className="px-2 py-1 rounded border bg-gray-50">Next</button>
        </div>
        <div className="text-sm text-gray-500">Source: ICS</div>
      </div>

      {loading && <div className="text-sm text-gray-500 mb-2">Loading calendar...</div>}
      {error && <div className="text-sm text-red-600 mb-2">Error loading ICS: {error}</div>}

      <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-xs font-medium text-gray-600">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const ymd = toYMD(d);
          const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
          const isBooked = bookedSet.has(ymd);
          const isPast = d < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

          const base = 'w-full h-12 flex items-center justify-center text-sm rounded';
          const classes = `${base} ${!isCurrentMonth ? 'opacity-40' : ''} ${isPast ? 'text-gray-400' : isBooked ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-700'}`;

          return (
            <div key={i} className={classes} title={isBooked ? 'Booked' : 'Available'}>
              <div className="text-sm">{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-gray-600">
        <div><span className="inline-block w-3 h-3 bg-green-50 border border-green-200 mr-2 align-middle"></span> Available</div>
        <div className="mt-1"><span className="inline-block w-3 h-3 bg-red-100 border border-red-200 mr-2 align-middle"></span> Booked / Unavailable</div>
      </div>
    </div>
  );
}
