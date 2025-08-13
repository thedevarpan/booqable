import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface CalendarDate {
  date: Date;
  isCurrentMonth: boolean;
  isAvailable: boolean;
  availableQuantity: number;
  isSelected: boolean;
  isToday: boolean;
}

interface VisualCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  unavailableDates: string[];
  minDate?: Date;
  className?: string;
}

export function VisualCalendar({
  selectedDate,
  onDateSelect,
  unavailableDates,
  minDate = new Date(),
  className = ''
}: VisualCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Days of the week
  const daysOfWeek = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

  // Generate calendar dates for the current month
  const generateCalendarDates = (): CalendarDate[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Monday of the first week
    const startDate = new Date(firstDay);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    startDate.setDate(startDate.getDate() - startDayOfWeek);
    
    // End on Sunday of the last week
    const endDate = new Date(lastDay);
    const endDayOfWeek = (lastDay.getDay() + 6) % 7;
    endDate.setDate(endDate.getDate() + (6 - endDayOfWeek));
    
    const dates: CalendarDate[] = [];
    const current = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === month;
      const isUnavailable = unavailableDates.includes(dateStr);
      const isPastDate = current < minDate;
      const isToday = current.getTime() === today.getTime();
      
      // Simulate availability quantity (2-5 items available)
      const availableQuantity = isUnavailable || isPastDate ? 0 : Math.floor(Math.random() * 4) + 2;
      
      dates.push({
        date: new Date(current),
        isCurrentMonth,
        isAvailable: !isUnavailable && !isPastDate && isCurrentMonth,
        availableQuantity,
        isSelected: selectedDate ? current.getTime() === selectedDate.getTime() : false,
        isToday,
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const calendarDates = generateCalendarDates();

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (calendarDate: CalendarDate) => {
    if (calendarDate.isAvailable) {
      onDateSelect(calendarDate.date);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonthName = monthNames[currentMonth.getMonth()];
  const currentYear = currentMonth.getFullYear();

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h3 className="text-lg font-semibold">
          {currentMonthName} {currentYear}
        </h3>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDates.map((calendarDate, index) => {
          const dayNumber = calendarDate.date.getDate();
          
          return (
            <button
              key={index}
              onClick={() => handleDateClick(calendarDate)}
              disabled={!calendarDate.isAvailable}
              className={`
                aspect-square flex flex-col items-center justify-center text-sm relative
                transition-all duration-200 rounded-lg
                ${!calendarDate.isCurrentMonth 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : calendarDate.isAvailable
                    ? 'hover:bg-purple-50 cursor-pointer text-gray-900'
                    : 'text-gray-400 cursor-not-allowed'
                }
                ${calendarDate.isSelected 
                  ? 'ring-2 ring-purple-500 ring-offset-1' 
                  : ''
                }
                ${calendarDate.isToday 
                  ? 'font-bold bg-gray-100' 
                  : ''
                }
              `}
            >
              {/* Date Number */}
              <span className="z-10">{dayNumber}</span>
              
              {/* Availability Indicator */}
              {calendarDate.isAvailable && calendarDate.isCurrentMonth && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {calendarDate.availableQuantity}
                  </div>
                </div>
              )}
              
              {/* Selected Date Ring */}
              {calendarDate.isSelected && (
                <div className="absolute inset-0 rounded-lg border-2 border-purple-500"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
            2
          </div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span>Unavailable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 border-2 border-purple-500 rounded"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
