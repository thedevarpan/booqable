// ICS Calendar Parser for Booqable availability
export interface CalendarEvent {
  start: Date;
  end: Date;
  summary: string;
  description?: string;
}

export class ICSParser {
  private static parseDateTime(dateStr: string): Date {
    // Handle both DATE and DATETIME formats
    if (dateStr.includes('T')) {
      // DATETIME format: 20231201T120000Z or 20231201T120000
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dateStr.substring(6, 8));
      const hour = parseInt(dateStr.substring(9, 11)) || 0;
      const minute = parseInt(dateStr.substring(11, 13)) || 0;
      const second = parseInt(dateStr.substring(13, 15)) || 0;
      
      return new Date(year, month, day, hour, minute, second);
    } else {
      // DATE format: 20231201
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      
      return new Date(year, month, day);
    }
  }

  static parseICS(icsContent: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const lines = icsContent.split('\n').map(line => line.trim());
    
    let currentEvent: Partial<CalendarEvent> = {};
    let inEvent = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = {};
        continue;
      }
      
      if (line === 'END:VEVENT') {
        if (currentEvent.start && currentEvent.end) {
          events.push(currentEvent as CalendarEvent);
        }
        inEvent = false;
        currentEvent = {};
        continue;
      }
      
      if (!inEvent) continue;
      
      // Parse event properties
      if (line.startsWith('DTSTART')) {
        const dateValue = line.split(':')[1];
        currentEvent.start = this.parseDateTime(dateValue);
      } else if (line.startsWith('DTEND')) {
        const dateValue = line.split(':')[1];
        currentEvent.end = this.parseDateTime(dateValue);
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8);
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.substring(12);
      }
    }
    
    return events;
  }

  static getUnavailableDates(events: CalendarEvent[]): string[] {
    const unavailableDates: Set<string> = new Set();
    
    events.forEach(event => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      
      // Generate all dates between start and end (inclusive)
      const currentDate = new Date(start);
      while (currentDate <= end) {
        unavailableDates.add(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    return Array.from(unavailableDates);
  }

  static isDateRangeAvailable(startDate: Date, endDate: Date, unavailableDates: string[]): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (unavailableDates.includes(dateStr)) {
        return false;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return true;
  }
}
