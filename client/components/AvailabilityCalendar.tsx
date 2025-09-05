import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface AvailabilityResult {
  available: boolean;
  conflicting_dates?: string[];
  message?: string;
}

interface AvailabilityCalendarProps {
  productId: string;
  onDateSelect: (
    startDate: string,
    endDate: string,
    rentalDays: number,
    availability?: AvailabilityResult,
  ) => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

interface DayAvailability {
  date: string;
  available: boolean;
  price?: number;
  quantity_available?: number;
  reason?: string;
}

export default function AvailabilityCalendar({
  productId,
  onDateSelect,
  initialStartDate,
  initialEndDate,
}: AvailabilityCalendarProps) {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(
    initialStartDate || null,
  );
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(
    initialEndDate || null,
  );
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [availability, setAvailability] = useState<
    Record<string, DayAvailability>
  >({});
  const [loading, setLoading] = useState(false);
  const [isSelectingEndDate, setIsSelectingEndDate] = useState(false);
  const [bookedRanges, setBookedRanges] = useState<
    Array<{ from: string; to: string }>
  >([]);

  const MINIMUM_RENTAL_DAYS = 12;
  const MAXIMUM_RENTAL_DAYS = 39;

  // Format date to YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // Parse date from YYYY-MM-DD
  const parseDate = (dateStr: string): Date => {
    return new Date(dateStr + "T00:00:00");
  };

  // Add days to a date
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // Calculate days between two dates (inclusive)
  const daysBetween = (start: string, end: string): number => {
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  // Fetch availability for the current month using combined endpoint (handles company-level ICS filtering)
  const fetchAvailability = async (month: Date) => {
    setLoading(true);
    try {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const from = formatDate(startOfMonth);
      const to = formatDate(endOfMonth);

      try {
        // First try the combined endpoint which merges ICS + API and filters company-level ICS to the product
        try {
          const qs = new URLSearchParams({ productId: productId, from, to });
          const resp = await (await import('@/lib/safeFetch')).safeFetch(`/api/availability/combined?${qs.toString()}`, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            timeoutMs: 10000,
          });
          if (resp && resp.ok) {
            const json = await resp.json().catch(() => null);
            const datesMap = json && json.dates;
            if (datesMap && typeof datesMap === 'object') {
              const mapped: Record<string, DayAvailability> = {};
              for (const [d, info] of Object.entries(datesMap)) {
                const dateKey = d.split('T')[0];
                if (info && typeof info === 'object') {
                  mapped[dateKey] = { date: dateKey, available: Boolean((info as any).available) } as DayAvailability;
                } else {
                  mapped[dateKey] = { date: dateKey, available: false } as DayAvailability;
                }
              }

              // derive ranges
              const dates = Object.keys(mapped).sort();
              const ranges: Array<{ from: string; to: string }> = [];
              let rangeStart: string | null = null;
              let prevDate: Date | null = null;
              for (const d of dates) {
                const isAvailable = mapped[d]?.available ?? true;
                const curr = new Date(d + 'T00:00:00');
                if (!isAvailable) {
                  if (!rangeStart) {
                    rangeStart = d;
                    prevDate = curr;
                  } else if (prevDate) {
                    const next = new Date(prevDate);
                    next.setDate(prevDate.getDate() + 1);
                    if (curr.getTime() === next.getTime()) {
                      prevDate = curr;
                    } else {
                      ranges.push({ from: rangeStart, to: prevDate.toISOString().split('T')[0] });
                      rangeStart = d;
                      prevDate = curr;
                    }
                  }
                } else {
                  if (rangeStart && prevDate) {
                    ranges.push({ from: rangeStart, to: prevDate.toISOString().split('T')[0] });
                    rangeStart = null;
                    prevDate = null;
                  }
                }
              }
              if (rangeStart && prevDate) ranges.push({ from: rangeStart, to: prevDate.toISOString().split('T')[0] });

              setBookedRanges(ranges);
              setAvailability(mapped);
              setLoading(false);
              return;
            }
          }
        } catch (combinedErr) {
          console.warn('Combined availability endpoint failed, falling back to calendar endpoint:', combinedErr);
        }

        // Fallback to legacy calendar endpoint (POST /api/availability/calendar)
        const maxAttempts = 2;
        let attempt = 0;
        let data: any = null;
        const postPayload = {
          product_id: productId,
          start_date: from,
          end_date: to,
        };

        while (attempt < maxAttempts) {
          try {
            attempt++;
            const resp = await (await import('@/lib/safeFetch')).safeFetch('/api/availability/calendar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(postPayload),
              credentials: 'same-origin',
              cache: 'no-store',
              timeoutMs: 8000,
            });

            if (!resp || !resp.ok) throw new Error(`Server responded ${resp && resp.status}`);
            data = await resp.json().catch(() => null);
            break;
          } catch (e) {
            console.warn('[availability] POST attempt failed:', e);
            if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 200 * attempt));
          }
        }

        if (!data) {
          // Fallback to GET query endpoint
          try {
            const qs = new URLSearchParams({ productId: productId, from, to });
            const resp = await (await import('@/lib/safeFetch')).safeFetch(`/api/availability/calendar?${qs.toString()}`, {
              method: 'GET',
              credentials: 'same-origin',
              cache: 'no-store',
              timeoutMs: 8000,
            });
            if (!resp || !resp.ok) throw new Error(`GET fallback responded ${resp && resp.status}`);
            const json = await resp.json().catch(() => null);
            const days = json?.data?.days || [];
            const availArray = days.map((d: any) => ({ date: d.date, available: Number(d.available_quantity || 0) > 0 }));
            data = { data: { availability: availArray } };
          } catch (getErr) {
            console.error('Availability (ICS) fetch failed:', getErr);
            toast({ title: 'Availability error', description: 'Failed to load calendar availability.', variant: 'destructive' });
            setAvailability({});
            setBookedRanges([]);
            setLoading(false);
            return;
          }
        }

        // Map response into availability map
        const availArray: Array<any> = data?.data?.availability || [];
        const mapped: Record<string, DayAvailability> = {};

        for (const item of availArray) {
          const dateKey = (item.date || item.day || '').split('T')[0];
          const available = Boolean(item.available);
          mapped[dateKey] = { date: dateKey, available } as DayAvailability;
        }

        // Derive contiguous booked ranges from the availability map (unavailable days)
        const deriveBookedRanges = (availMap: Record<string, DayAvailability>) => {
          const dates = Object.keys(availMap).sort();
          const ranges: Array<{ from: string; to: string }> = [];
          let rangeStart: string | null = null;
          let prevDate: Date | null = null;

          for (const d of dates) {
            const isAvailable = availMap[d]?.available ?? true;
            const curr = new Date(d + 'T00:00:00');
            if (!isAvailable) {
              if (!rangeStart) {
                rangeStart = d;
                prevDate = curr;
              } else if (prevDate) {
                const next = new Date(prevDate);
                next.setDate(prevDate.getDate() + 1);
                if (curr.getTime() === next.getTime()) {
                  prevDate = curr;
                } else {
                  ranges.push({ from: rangeStart, to: prevDate.toISOString().split('T')[0] });
                  rangeStart = d;
                  prevDate = curr;
                }
              }
            } else {
              if (rangeStart && prevDate) {
                ranges.push({ from: rangeStart, to: prevDate.toISOString().split('T')[0] });
                rangeStart = null;
                prevDate = null;
              }
            }
          }

          if (rangeStart && prevDate) {
            ranges.push({ from: rangeStart, to: prevDate.toISOString().split('T')[0] });
          }

          return ranges;
        };

        const ranges = deriveBookedRanges(mapped);
        setBookedRanges(ranges);
        setAvailability(mapped);
      } catch (err) {
        console.error('Availability (ICS) fetch failed:', err);
        toast({ title: 'Availability error', description: 'Failed to load calendar availability.', variant: 'destructive' });
        setAvailability({});
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      setAvailability({});
      toast({ title: 'Availability error', description: 'Failed to load calendar availability.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Load availability when month changes
  useEffect(() => {
    fetchAvailability(currentMonth);
  }, [currentMonth, productId]);

  // Handle date click
  const handleDateClick = async (date: string) => {
    const today = formatDate(new Date());

    if (date < today) {
      toast({
        title: "Invalid date",
        description: "Cannot select past dates.",
        variant: "destructive",
      });
      return;
    }

    const isDateAvailable = availability[date]?.available ?? false;
    if (!isDateAvailable) {
      toast({
        title: "Date unavailable",
        description: "This date is not available for rental.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStartDate || isSelectingEndDate) {
      // Selecting start date
      setSelectedStartDate(date);
      setIsSelectingEndDate(true);

      // Auto-select end date (start + minimum rental days - 1 to make inclusive range)
      const startDate = parseDate(date);
      const autoEndDate = addDays(startDate, MINIMUM_RENTAL_DAYS - 1);
      const autoEndDateStr = formatDate(autoEndDate);

      // Check if the auto-selected period is available based on loaded availability
      const isRangeAvailable = checkRangeAvailability(date, autoEndDateStr);

      if (isRangeAvailable) {
        try {
          const safe = await import('@/lib/safeFetch');
          const resp = await safe.safeFetch("/api/availability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              product_id: productId,
              start_date: date,
              end_date: autoEndDateStr,
              quantity: 1,
            }),
            credentials: "same-origin",
            cache: "no-store",
            timeoutMs: 8000
          });
          const result = await resp.json().catch(() => null);
          const available = result && result.success ? result.data.available : false;

          if (available) {
            setSelectedEndDate(autoEndDateStr);
            setIsSelectingEndDate(false);
            onDateSelect(
              date,
              autoEndDateStr,
              MINIMUM_RENTAL_DAYS,
              result.data,
            );
          } else {
            setSelectedEndDate(null);
            toast({
              title: "Dates unavailable",
              description:
                result && result.data && result.data.message
                  ? result.data.message
                  : `The ${MINIMUM_RENTAL_DAYS}-day period is not available.`,
              variant: "destructive",
            });
          }
        } catch (err) {
          console.error("Server availability check failed:", err);
          setSelectedEndDate(null);
          toast({
            title: "Availability check failed",
            description:
              "Could not verify availability. Please try again later.",
            variant: "destructive",
          });
        }
      } else {
        setSelectedEndDate(null);
        toast({
          title: "Dates unavailable",
          description: `The ${MINIMUM_RENTAL_DAYS}-day period starting from this date is not fully available. Please select an end date manually.`,
          variant: "destructive",
        });
      }
    } else {
      // Selecting end date
      if (date <= selectedStartDate) {
        toast({
          title: "Invalid end date",
          description: "End date must be after start date.",
          variant: "destructive",
        });
        return;
      }

      const rentalDays = daysBetween(selectedStartDate, date);

      if (
        rentalDays < MINIMUM_RENTAL_DAYS ||
        rentalDays > MAXIMUM_RENTAL_DAYS
      ) {
        toast({
          title: "Invalid rental period",
          description: `Rental period must be between ${MINIMUM_RENTAL_DAYS} and ${MAXIMUM_RENTAL_DAYS} days.`,
          variant: "destructive",
        });
        return;
      }

      // Check if entire range is available
      const isRangeAvailable = checkRangeAvailability(selectedStartDate, date);

      if (!isRangeAvailable) {
        toast({
          title: "Period unavailable",
          description: "Some dates in the selected period are not available.",
          variant: "destructive",
        });
        return;
      }

      // Verify live availability via server
      try {
        const safe = await import('@/lib/safeFetch');
        const resp = await safe.safeFetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            start_date: selectedStartDate,
            end_date: date,
            quantity: 1,
          }),
          credentials: "same-origin",
          cache: "no-store",
          timeoutMs: 8000
        });
        const result = await resp.json().catch(() => null);
        const available = result && result.success ? result.data.available : false;

        if (!available) {
          toast({
            title: "Period unavailable",
            description:
              result && result.data && result.data.message
                ? result.data.message
                : "Some dates in the selected period are not available.",
            variant: "destructive",
          });
          return;
        }

        setSelectedEndDate(date);
        setIsSelectingEndDate(false);
        onDateSelect(selectedStartDate!, date, rentalDays, result.data);
      } catch (err) {
        console.error("Server availability check failed:", err);
        toast({
          title: "Availability check failed",
          description: "Could not verify availability. Please try again later.",
          variant: "destructive",
        });
      }
    }
  };

  // Check if a date range is fully available
  const checkRangeAvailability = (
    startDate: string,
    endDate: string,
  ): boolean => {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const current = new Date(start);

    while (current <= end) {
      const dateStr = formatDate(current);
      // Require explicit availability true for each date; unknown or false -> not available
      if (!availability[dateStr] || !availability[dateStr].available) {
        return false;
      }
      current.setDate(current.getDate() + 1);
    }

    return true;
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setIsSelectingEndDate(false);
  };

  // Get the date class for styling
  const getDateClass = (date: string): string => {
    const today = formatDate(new Date());
    const isPast = date < today;
    const isAvailable = availability[date]?.available ?? false;
    const isSelected = date === selectedStartDate || date === selectedEndDate;
    const isInRange =
      selectedStartDate &&
      selectedEndDate &&
      date > selectedStartDate &&
      date < selectedEndDate;
    const isHovered = hoveredDate === date;

    let classes =
      "w-full h-10 flex items-center justify-center text-sm rounded-md cursor-pointer transition-colors ";

    if (isPast) {
      classes += "text-gray-400 cursor-not-allowed ";
    } else if (!isAvailable) {
      classes += "text-red-600 bg-red-50 cursor-not-allowed ";
    } else if (isSelected) {
      classes += "bg-luxury-purple-600 text-white font-semibold ";
    } else if (isInRange) {
      classes += "bg-luxury-purple-100 text-luxury-purple-700 ";
    } else if (isHovered) {
      classes += "bg-luxury-purple-50 text-luxury-purple-600 ";
    } else {
      classes += "hover:bg-green-50 text-green-700 border border-green-200 ";
    }

    return classes;
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthYear = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Select Rental Dates
          </div>
          {selectedStartDate && selectedEndDate && (
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selection Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="text-sm">
            {!selectedStartDate
              ? "Select your start date"
              : !selectedEndDate
                ? `Start: ${parseDate(selectedStartDate).toLocaleDateString()}`
                : `${parseDate(selectedStartDate).toLocaleDateString()} - ${parseDate(selectedEndDate).toLocaleDateString()}`}
          </div>
          {selectedStartDate && selectedEndDate && (
            <Badge variant="secondary">
              {daysBetween(selectedStartDate, selectedEndDate)} days
            </Badge>
          )}
        </div>

        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() - 1,
                  1,
                ),
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold">{monthYear}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1,
                  1,
                ),
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            const dateStr = formatDate(day);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

            return (
              <div
                key={index}
                className={`${getDateClass(dateStr)} ${!isCurrentMonth ? "opacity-30" : ""}`}
                title={
                  availability[dateStr]?.available ? "Available" : "Unavailable"
                }
                aria-disabled={!(availability[dateStr]?.available ?? false)}
                onClick={() => isCurrentMonth && handleDateClick(dateStr)}
                onMouseEnter={() => setHoveredDate(dateStr)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                {day.getDate()}
              </div>
            );
          })}
        </div>

        {/* Minimum rental notice */}
        <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          <Clock className="h-4 w-4" />
          <span>Minimum rental period: {MINIMUM_RENTAL_DAYS} days</span>
        </div>

        {/* If availability data couldn't be loaded, show a gentle notice but allow tentative selection */}

        {loading && (
          <div className="text-center text-sm text-muted-foreground">
            Loading availability...
          </div>
        )}

        {/* ICS Calendar Booked Ranges (derived from fetched availability) */}
        <div className="p-3 bg-gray-50 rounded-lg text-sm">
          <div className="font-medium mb-2">ICS Calendar Booked Periods</div>
          <div className="text-xs text-muted-foreground mb-2">
            Source:
            https://dance-costumes-for-hire-90e5.booqable.com/integrations/calendar/e313abf2b30213a486a238d0986a64df/orders.ics
          </div>
          {bookedRanges.length === 0 ? (
            <div className="text-sm text-green-600">
              No bookings for this month
            </div>
          ) : (
            <ul className="list-disc list-inside space-y-1">
              {bookedRanges.map((r, i) => (
                <li key={i}>
                  {new Date(r.from).toLocaleDateString()} —{" "}
                  {new Date(r.to).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
