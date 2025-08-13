import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { booqableAPI } from '../lib/booqable';

interface RentalPeriodSelectorProps {
  productId: string;
  onAvailabilityChange: (availability: {
    available: boolean;
    availableQuantity: number;
    startDate: string;
    endDate: string;
    totalDays: number;
  } | null) => void;
}

export function RentalPeriodSelector({ productId, onAvailabilityChange }: RentalPeriodSelectorProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    availableQuantity: number;
    conflictingOrders?: any[];
  } | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];
  
  // Set default start date to today and end date to tomorrow
  useEffect(() => {
    if (!startDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);
    }
    if (!endDate) {
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      setEndDate(dayAfterTomorrow.toISOString().split('T')[0]);
    }
  }, []);

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const totalDays = calculateDays(startDate, endDate);

  const checkAvailability = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    if (new Date(startDate) < new Date(today)) {
      toast.error('Start date cannot be in the past');
      return;
    }

    try {
      setChecking(true);
      setHasChecked(false);

      console.log('Checking availability for:', { productId, startDate, endDate });

      // Add a small delay to prevent rapid API calls
      await new Promise(resolve => setTimeout(resolve, 500));

      const result = await booqableAPI.checkAvailability(productId, startDate, endDate);

      console.log('Availability result:', result);

      setAvailability(result);
      setHasChecked(true);

      // Notify parent component
      onAvailabilityChange({
        available: result.available,
        availableQuantity: result.availableQuantity,
        startDate,
        endDate,
        totalDays,
      });

      if (result.available) {
        toast.success(`Available! ${result.availableQuantity} units available for your dates.`);
      } else {
        toast.error('Not available for selected dates. Please try different dates.');
      }
    } catch (error) {
      console.error('Error checking availability:', error);

      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else if (errorMessage.includes('404')) {
        toast.error('Product not found. Please refresh the page.');
      } else if (errorMessage.includes('500')) {
        toast.error('Server error. Please try again in a few moments.');
      } else {
        toast.error('Failed to check availability. Please try again.');
      }

      setAvailability(null);
      setHasChecked(false);
      onAvailabilityChange(null);
    } finally {
      setChecking(false);
    }
  };

  const handleDateChange = () => {
    // Reset availability when dates change
    setAvailability(null);
    setHasChecked(false);
    onAvailabilityChange(null);
  };

  useEffect(() => {
    handleDateChange();
  }, [startDate, endDate]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          Select Rental Period
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <Input
              type="date"
              value={startDate}
              min={today}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <Input
              type="date"
              value={endDate}
              min={startDate || today}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Rental Summary */}
        {startDate && endDate && totalDays > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-purple-600" />
              <span>
                Rental Period: <strong>{totalDays} day{totalDays !== 1 ? 's' : ''}</strong>
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              From {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
            </div>
          </div>
        )}

        {/* Check Availability Button */}
        <Button
          onClick={checkAvailability}
          disabled={!startDate || !endDate || checking || totalDays <= 0}
          className="w-full"
          size="lg"
        >
          {checking ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking Availability...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Check Availability
            </>
          )}
        </Button>

        {/* Availability Status */}
        {hasChecked && availability && (
          <div className={`p-4 rounded-lg border ${
            availability.available 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {availability.available ? (
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
              {availability.available ? (
                <div className="space-y-1">
                  <p className="text-green-700">
                    <strong>{availability.availableQuantity}</strong> unit{availability.availableQuantity !== 1 ? 's' : ''} available for your selected dates.
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      ✓ In Stock
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {totalDays} day{totalDays !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-red-700">
                    This item is not available for your selected dates.
                  </p>
                  <p className="text-red-600 text-xs">
                    Please try different dates or contact us for assistance.
                  </p>
                  {availability.conflictingOrders && availability.conflictingOrders.length > 0 && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {availability.conflictingOrders.length} conflicting booking{availability.conflictingOrders.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Please select your rental dates and check availability before adding to cart. 
            Availability is checked in real-time against our booking system.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
