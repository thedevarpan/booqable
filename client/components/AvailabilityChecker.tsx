import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2, Loader2, CalendarDays, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { ICSParser, type CalendarEvent } from '../lib/icsParser';
import { VisualCalendar } from './VisualCalendar';

interface AvailabilityCheckerProps {
  productId: string;
  productName: string;
  pricePerDay: number;
  onAvailabilityConfirmed: (availability: {
    available: boolean;
    startDate: string;
    endDate: string;
    totalDays: number;
    totalPrice: number;
  }) => void;
}

const ICS_CALENDAR_URL = 'https://dance-costumes-for-hire-90e5.booqable.com/integrations/calendar/e313abf2b30213a486a238d0986a64df/orders.ics';
const MINIMUM_RENTAL_DAYS = 12;

export function AvailabilityChecker({ 
  productId, 
  productName, 
  pricePerDay, 
  onAvailabilityConfirmed 
}: AvailabilityCheckerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [calculatedEndDate, setCalculatedEndDate] = useState<Date | null>(null);
  const [isValidSelection, setIsValidSelection] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (selectedStartDate) {
      const endDate = new Date(selectedStartDate);
      endDate.setDate(selectedStartDate.getDate() + MINIMUM_RENTAL_DAYS);

      setCalculatedEndDate(endDate);

      // Check if the entire rental period is available
      const isAvailable = ICSParser.isDateRangeAvailable(selectedStartDate, endDate, unavailableDates);
      setIsValidSelection(isAvailable);

      if (!isAvailable) {
        toast.error('This start date is unavailable. Please choose another.');
      }
    }
  }, [selectedStartDate, unavailableDates]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      console.log('Loading calendar data from:', ICS_CALENDAR_URL);
      
      // Fetch the .ics file through a proxy to avoid CORS issues
      const response = await fetch(`/api/proxy-calendar?url=${encodeURIComponent(ICS_CALENDAR_URL)}`);
      
      if (!response.ok) {
        // Fallback: try direct fetch (might fail due to CORS)
        const directResponse = await fetch(ICS_CALENDAR_URL);
        if (!directResponse.ok) {
          throw new Error('Failed to fetch calendar data');
        }
        const icsContent = await directResponse.text();
        processCalendarData(icsContent);
      } else {
        const icsContent = await response.text();
        processCalendarData(icsContent);
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
      
      // For demo purposes, create some sample unavailable dates
      const sampleUnavailableDates = generateSampleUnavailableDates();
      setUnavailableDates(sampleUnavailableDates);
      setShowPicker(true);
      
      toast.info('Using demo availability data. In production, this would load from the calendar.');
    } finally {
      setLoading(false);
    }
  };

  const processCalendarData = (icsContent: string) => {
    try {
      const events = ICSParser.parseICS(icsContent);
      const unavailable = ICSParser.getUnavailableDates(events);
      
      setCalendarEvents(events);
      setUnavailableDates(unavailable);
      setShowPicker(true);
      
      console.log(`Loaded ${events.length} calendar events, ${unavailable.length} unavailable dates`);
      toast.success(`Calendar loaded! Found ${events.length} bookings.`);
    } catch (error) {
      console.error('Error parsing calendar data:', error);
      toast.error('Error parsing calendar data. Using demo data.');
      
      // Fallback to demo data
      const sampleUnavailableDates = generateSampleUnavailableDates();
      setUnavailableDates(sampleUnavailableDates);
      setShowPicker(true);
    }
  };

  const generateSampleUnavailableDates = (): string[] => {
    const unavailable: string[] = [];
    const today = new Date();
    
    // Add some sample unavailable periods
    // Period 1: 5 days from now
    for (let i = 5; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      unavailable.push(date.toISOString().split('T')[0]);
    }
    
    // Period 2: 15 days from now
    for (let i = 15; i < 20; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      unavailable.push(date.toISOString().split('T')[0]);
    }
    
    // Period 3: 25 days from now  
    for (let i = 25; i < 28; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      unavailable.push(date.toISOString().split('T')[0]);
    }
    
    return unavailable;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedStartDate(date);
  };

  const confirmSelection = () => {
    if (!selectedStartDate || !calculatedEndDate || !isValidSelection) return;

    const totalPrice = pricePerDay * MINIMUM_RENTAL_DAYS * quantity;

    onAvailabilityConfirmed({
      available: true,
      startDate: selectedStartDate.toISOString().split('T')[0],
      endDate: calculatedEndDate.toISOString().split('T')[0],
      totalDays: MINIMUM_RENTAL_DAYS,
      totalPrice,
    });

    toast.success(`Availability confirmed for ${MINIMUM_RENTAL_DAYS} days!`);
    setShowPicker(false);
  };

  if (!showPicker) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 text-purple-600" />
          <h3 className="text-lg font-semibold mb-2">Check Availability</h3>
          <p className="text-muted-foreground mb-4">
            Check real-time availability for {productName}
          </p>
          <Button
            onClick={loadCalendarData}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Calendar...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Check Availability
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Check availability
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPicker(false)}
            className="p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quantity Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Quantity</label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="h-8 w-8 p-0"
            >
              -
            </Button>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-center"
              min="1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(quantity + 1)}
              className="h-8 w-8 p-0"
            >
              +
            </Button>
          </div>
        </div>

        {/* Visual Calendar */}
        <div>
          <VisualCalendar
            selectedDate={selectedStartDate}
            onDateSelect={handleDateSelect}
            unavailableDates={unavailableDates}
            minDate={new Date()}
          />
        </div>

        {/* Rental Info */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm text-blue-800">
            <p className="font-medium">Minimum Rental Period: {MINIMUM_RENTAL_DAYS} days</p>
            <p className="text-xs mt-1">
              End date will be automatically calculated as start date + {MINIMUM_RENTAL_DAYS} days
            </p>
          </div>
        </div>

        {/* Calculated Rental Period */}
        {selectedStartDate && calculatedEndDate && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm mb-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Calculated Rental Period</span>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Start:</strong> {selectedStartDate.toLocaleDateString()}
              </p>
              <p>
                <strong>End:</strong> {calculatedEndDate.toLocaleDateString()}
              </p>
              <p>
                <strong>Duration:</strong> {MINIMUM_RENTAL_DAYS} days
              </p>
              <p>
                <strong>Quantity:</strong> {quantity}
              </p>
              <p className="text-purple-600 font-medium">
                <strong>Total Cost:</strong> £{(pricePerDay * MINIMUM_RENTAL_DAYS * quantity).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Availability Status */}
        {selectedStartDate && (
          <div className={`p-4 rounded-lg border ${
            isValidSelection 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {isValidSelection ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Available!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">Not Available</span>
                </>
              )}
            </div>
            
            <div className="mt-2 text-sm">
              {isValidSelection ? (
                <div className="space-y-1">
                  <p className="text-green-700">
                    This rental period is available for booking.
                  </p>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    ✓ Available for {MINIMUM_RENTAL_DAYS} days
                  </Badge>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-red-700">
                    This start date is unavailable. Please choose another.
                  </p>
                  <p className="text-red-600 text-xs">
                    The {MINIMUM_RENTAL_DAYS}-day period overlaps with existing bookings.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirm Button */}
        {selectedStartDate && isValidSelection && (
          <Button
            onClick={confirmSelection}
            className="w-full"
            size="lg"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirm Rental Period
          </Button>
        )}

        {/* Calendar Summary */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Calendar Status:</strong> {calendarEvents.length} booking{calendarEvents.length !== 1 ? 's' : ''} found, 
            {unavailableDates.length} day{unavailableDates.length !== 1 ? 's' : ''} unavailable
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
